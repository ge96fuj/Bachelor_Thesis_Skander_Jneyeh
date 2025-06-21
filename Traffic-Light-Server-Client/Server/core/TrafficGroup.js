const { TrafficLightStatus } = require('./TrafficLight');

class TrafficGroup {
  constructor(name, lightIDs) {
    this.name = name;
    this.lightIDs = lightIDs;
    this.lights = lightIDs.map(id => global.lights[id]);
    this.currActLight = 0;
    this.state = 0;
    // API interrupt
    this.interrupt = {
      active: false,
      targetID: null
    };
    this.reset = false;
    this.notReadyBlinkSent = false;
  }

  isReady() {
    let notConnected = this.lights.filter(l => !l.isConnected());
    if (notConnected.length > 0) {
      console.log(`[${this.name}] not connected : ${notConnected.map(l => l.id).join(', ')}`);
      // reset the group if its interrupted by disconnection . when the group is ready again , it will repeat from the beginn again . 
      this.reset = true;
      //send blink request to the connected light . until the group is ready again
      if (!this.notReadyBlinkSent) {
        const connectedLights = this.lights.filter(l => l.isConnected());
        for (const light of connectedLights) {
          light.goBlink();
        }
        this.notReadyBlinkSent = true;
      }
      return false;
    }
    if (this.notReadyBlinkSent) {
      this.notReadyBlinkSent = false;
    }
    return true;
  }

  getCurLight() {
    return this.lights[this.currActLight];
  }
  async runCycle() {
    console.log(`Start cycle for  [${this.name}]`);

    const transitions = [
      { log: "Yellow to GREEN", action: "goYellow", durationKey: "yellow" },
      { log: "GREEN", action: "goGreen", durationKey: "green" },
      { log: "Yellow to RED", action: "goYellow", durationKey: "yellow" },
      { log: "RED", action: "goRed", durationKey: "red" }
    ];
// Last Transition time
    let lastTr = Date.now();
    let switchTran = false;

    while (true) {
      const currentTime = Date.now();
//
      if (!this.isReady()) {
        console.log(`[${this.name}] Grp not ready `);
        this.reset = true;
        await this.delay(1000);
        continue;
      }

      if (this.reset) {
        console.log(`[${this.name}] reset grp`);
        await this.goAllRed();
        this.state = 0;
        this.currActLight = 0;
        this.reset = false;
        lastTr = Date.now();
        switchTran = false;
        continue;
      }

      const light = this.getCurLight();
      const step = transitions[this.state];
      const apiInterrupt = this.interrupt.active;
      const apiTarget = light.id === this.interrupt.targetID;

      if (apiInterrupt && !apiTarget) {
        console.log(`[${this.name}] ${light.id} is not target. going red fast`);
        if (light.status === TrafficLightStatus.GREEN) {
          await light.goYellow();
        }
        await light.goRed();
        this.currActLight = this.lights.findIndex(l => l.id === this.interrupt.targetID);
        this.state = 0;
        switchTran = false;
        lastTr = Date.now();
        continue;
      }

      if (apiInterrupt && apiTarget) {
        console.log(`[${this.name}] Holding GREEN for interrupt target: ${light.id}`);
        await this.holdGreen(light.id);
        this.currActLight = (this.currActLight + 1) % this.lights.length;
        this.state = 0;
        switchTran = false;
        lastTr = Date.now();
        continue;
      }

      const duration = light.durations[step.durationKey];

      if (!switchTran) {
        console.log(`[${this.name}] ${step.log} → ${light.id}`);
        await light[step.action]();
        switchTran = true;
        lastTr = Date.now();
      }

      if (currentTime - lastTr >= duration) {
        this.state = (this.state + 1) % 4;
        if (this.state === 0) {
          this.currActLight = (this.currActLight + 1) % this.lights.length;
        }
        switchTran = false;
      }

      await this.delay(200);
    }
  }

  async holdGreen(targetID) {
    const targetLight = this.lights.find(l => l.id === targetID);
    if (!targetLight || !targetLight.isConnected()) return;

    console.log(`[${this.name}] Handling interrupt for ${targetID}...`);

    switch (targetLight.status) {
      case TrafficLightStatus.RED:
        await targetLight.goYellow();
        await this.delay(1000);
        await targetLight.goGreen();
        break;

      case TrafficLightStatus.YELLOW_TO_R:
        await targetLight.goRed();
        await this.delay(1000);
        await targetLight.goYellow();
        await this.delay(1000);
        await targetLight.goGreen();
        break;

      case TrafficLightStatus.YELLOW_TO_G:
        await this.delay(1000);
        break;

      case TrafficLightStatus.GREEN:
        break;

      default:
        await targetLight.goGreen();
        break;
    }

    console.log(`[${this.name}] ${targetID} is now GREEN (holding for interrupt)`);

    while (this.interrupt.active) {
      await this.delay(1000);
    }

    console.log(`[${this.name}] Rst observed . Returning to RED for ${targetID}`);
    await targetLight.goYellow();
    await this.delay(2000);
    await targetLight.goRed();
  }

  async goAllRed() {
    console.log(`[${this.name}] Forcing all RED...`);

    for (const light of this.lights) {
      if (light.isConnected()) {
        await light.goRed();
      } else {
        console.warn(`[${this.name}] Light ${light.id} is not connected. Skipped.`);
      }
    }

    this.state = 0;
    this.currActLight = 0;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = TrafficGroup;
