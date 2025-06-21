const { goRed, goGreen, goYellow, goBlink } = require('../utils/traffic.commands');

const TrafficLightStatus = {
  RED: 0x00,
  YELLOW_TO_G: 0x01,
  GREEN: 0x02,
  YELLOW_TO_R: 0x03,
  BLINK: 0x04,
  UNKNOWN: 0x05
};

class TrafficLight {
  constructor(id, x, y, status = TrafficLightStatus.UKNOWN, socket = null, durations = {}) {
    this.id = id;
    this.localization_x = x;
    this.localization_y = y;
    this.status = status;
    this.socket = socket;
    this.durations = durations;
  }

  isConnected() {
    return this.socket && this.socket.writable;
  }

    goRed() {
    if (this.isConnected()) {
    goRed(this.socket, this.id);
    this.delay(150);

      this.status = TrafficLightStatus.RED;
      
    }
  }

    goYellow() {
    if (this.isConnected()) {
      goYellow(this.socket, this.id);
      this.delay(150);

      this.status = (this.status === TrafficLightStatus.RED)
        ? TrafficLightStatus.YELLOW_TO_G
        : TrafficLightStatus.YELLOW_TO_R;

      
    }
  }

   goGreen() {
    if (this.isConnected()) {
    goGreen(this.socket, this.id);
    this.delay(150);

      this.status = TrafficLightStatus.GREEN;
      
    }
  }

   goBlink() {
    if (this.isConnected()) {
      
      goBlink(this.socket, this.id);
      this.delay(150);
      this.status = TrafficLightStatus.BLINK;
      
    }
  }

  changeStatus(newStatus) {
    this.status = newStatus;
  }

  getSocket() {
    return this.socket;
  }

  getDurations() {
    return this.durations;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
}

module.exports = { TrafficLight, TrafficLightStatus };
