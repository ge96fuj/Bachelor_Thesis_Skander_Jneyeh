const express = require('express');
const app = express();
const port = 3000;
const path = require('path');

app.use(express.json());



app.get('/changeGreen/:id', (req, res) => {
  const id = req.params.id;
  const light = global.lights[id];
  if (!light) return res.status(404).json({ error: 'Light not found' });

  // Find the group that contains this light
  const group = global.trafficGroupsList.find(g => g.lightIDs.includes(id));
  if (!group) return res.status(404).json({ error: 'Group not found for light ' + id });

  if (group.interrupt.active) {
    return res.status(400).json({ error: 'Group is already under interrupt' });
  }

  group.interrupt = {
    active: true,
    targetID: id
  };

  res.json({ message: `✅ Interrupt triggered for ${id} in group ${group.name}` });
});

//Reset can be done either with id of the light or with the name of the group

app.get('/reset/:id', (req, res) => {
  const id = req.params.id;
  const light = global.lights[id];
  if (!light) return res.status(404).json({ error: 'Light not found' });

  // Find the group that contains this light
  const group = global.trafficGroupsList.find(g => g.lightIDs.includes(id));
  if (!group) return res.status(404).json({ error: 'Group not found for light ' + id });

  if (!group.interrupt.active) {
    return res.status(400).json({ error: 'No active interrupt for this group' });
  }

  group.interrupt = {
    active: false,
    targetID: null
  };
  res.json({ message: `✅ Interrupt cleared for group ${group.name}` });
});
// Stop the interrupt with reset 
app.get('/reset/:group', (req, res) => {
  const groupName = req.params.group;
  const group = global.trafficGroupsList.find(g => g.name === groupName);

  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  if (!group.interrupt.active) {
    return res.status(400).json({ error: 'No active interrupt for this group' });
  }

  group.interrupt = {
    active: false,
    targetID: null
  };

  res.json({ message: `✅ Interrupt cleared for group ${group.name}` });
});





// Start the API server
app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
});
