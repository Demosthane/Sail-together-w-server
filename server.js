const express = require("express");
const app = express();
const fs = require('fs');
const bodyParser = require('body-parser');
const port = 3000;
const path = require('path');

app.use(bodyParser.json());
app.use(express.static(__dirname));
app.use(express.json());

console.log(path.resolve(__dirname, 'waitlist.json'));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

  

app.post('/add-to-waitlist', (req, res) => {
    const { name } = req.body;
  
    // Read the existing waitlist data from the file
    const data = fs.readFileSync('waitlist.json', 'utf-8');
    const waitlist = JSON.parse(data).waitlist;
  
    // Get the next ID by incrementing the last ID in the waitlist
    const nextId = waitlist.length > 0 ? waitlist[waitlist.length - 1].id + 1 : 1;
  
    // Add the new waitlist entry to the data
    waitlist.push({ id: nextId, name: name });
  
    // Write the updated data back to the file
    fs.writeFileSync('waitlist.json', JSON.stringify({ waitlist: waitlist }));
  
    // Return the updated waitlist data in the response
    res.json({ waitlist: waitlist });
});

app.post('/waitlist/remove', (req, res) => {
  const { id } = req.body;

  // Read the existing waitlist data from the file
  const data = fs.readFileSync('waitlist.json', 'utf-8');
  console.log('Existing data:', data);
  const waitlist = JSON.parse(data).waitlist;

  // Find the index of the person to remove by ID
  const index = waitlist.findIndex(person => person.id === id);
  if (index === -1) {
    return res.status(404).send({ error: 'Person not found' });
  }

  // Remove the person from the waitlist
  const removedPerson = waitlist.splice(index, 1)[0];

  // Write the updated data back to the file
  fs.writeFileSync('waitlist.json', JSON.stringify({ waitlist: waitlist }));

  // Return the removed person in the response
  res.json({ removedPerson: removedPerson });
});

app.get('/waitlist', (req, res) => {
  const data = fs.readFileSync('waitlist.json', 'utf-8');
  const waitlist = JSON.parse(data);
  res.json(waitlist);
});

const shipJsonPath = './ship.json';

app.post('/add-ship', (req, res) => {
  const { name, openSlots } = req.body;

  if (!name || !openSlots) {
    return res.status(400).json({ error: 'Missing name or openSlots' });
  }

  fs.readFile(shipJsonPath, 'utf8', (err, data) => {
    if (err && err.code !== 'ENOENT') {
      return res.status(500).json({ error: 'Error reading ships file' });
    }

    let ships = [];
    if (data) {
      try {
        ships = JSON.parse(data);
        // Make sure ships is an array
        if (!Array.isArray(ships)) {
          ships = [];
        }
      } catch (error) {
        return res.status(500).json({ error: 'Error parsing ships file' });
      }
    }

    // Generate the new ship ID based on the existing ship IDs
    const newShipId = ships.length > 0 ? Math.max(...ships.map(ship => ship.id)) + 1 : 1;

    // Add the new ship with an empty crew array and a unique id
    ships.push({ id: newShipId, name, openSlots, crew: [] });

    fs.writeFile(shipJsonPath, JSON.stringify(ships, null, 2), 'utf8', err => {
      if (err) {
        return res.status(500).json({ error: 'Error writing ships file' });
      }

      console.log(`Ship "${name}" with ${openSlots} slots added.`);
      res.status(201).json({ message: 'Ship added', ships });
    });
  });
});


app.post('/ships/:shipId/crew', (req, res) => {
  const { shipId } = req.params;
  const { crewMember } = req.body;

  if (!crewMember || !crewMember.id || !crewMember.name) {
    return res.status(400).json({ error: 'Missing crewMember, id or name' });
  }

  fs.readFile(shipJsonPath, 'utf8', (err, data) => {
    if (err && err.code !== 'ENOENT') {
      return res.status(500).json({ error: 'Error reading ships file' });
    }

    let ships = [];
    if (data) {
      try {
        ships = JSON.parse(data);
        if (!Array.isArray(ships)) {
          ships = [];
        }
      } catch (error) {
        return res.status(500).json({ error: 'Error parsing ships file' });
      }
    }

    const ship = ships.find(ship => ship.id === parseInt(shipId, 10));

    if (!ship) {
      return res.status(404).json({ error: 'Ship not found' });
    }

    if (ship.crew.length >= ship.openSlots) {
      return res.status(400).json({ error: 'No open slots on this ship' });
    }

    ship.crew.push(crewMember);

    fs.writeFile(shipJsonPath, JSON.stringify(ships, null, 2), 'utf8', err => {
      if (err) {
        return res.status(500).json({ error: 'Error writing ships file' });
      }

      console.log(`Crew member "${crewMember.name}" added to ship "${ship.name}".`);
      res.status(201).json({ message: 'Crew member added', ship });
    });
  });
});

app.get("/ships", (req, res) => {
  fs.readFile(shipJsonPath, "utf-8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Error reading ships file" });
    }

    let ships = [];
    if (data) {
      try {
        ships = JSON.parse(data);
      } catch (error) {
        return res.status(500).json({ error: "Error parsing ships file" });
      }
    }

    res.json({ ships: ships });
  });
});

app.post("/ships/remove", (req, res) => {
  const { id } = req.body;
  
  fs.readFile(shipJsonPath, "utf-8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Error reading ships file" });
    }

    let ships = [];
    if (data) {
      try {
        ships = JSON.parse(data);
      } catch (error) {
        return res.status(500).json({ error: "Error parsing ships file" });
      }
    }

    const shipIndex = ships.findIndex(ship => ship.id === id);
    if (shipIndex === -1) {
      return res.status(404).json({ error: "Ship not found" });
    }

    ships.splice(shipIndex, 1);

    fs.writeFile(shipJsonPath, JSON.stringify(ships), "utf-8", (err) => {
      if (err) {
        return res.status(500).json({ error: "Error writing ships file" });
      }
      res.json({ message: "Ship removed", ships });
    });
  });
});

app.post("/ships/update", (req, res) => {
  const { shipId, crewMemberId, action } = req.body;

  fs.readFile(shipJsonPath, "utf-8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Error reading ships file" });
    }

    let ships = [];
    if (data) {
      try {
        ships = JSON.parse(data);
      } catch (error) {
        return res.status(500).json({ error: "Error parsing ships file" });
      }
    }

    const shipIndex = ships.findIndex(ship => ship.id === shipId);
    if (shipIndex === -1) {
      return res.status(404).json({ error: "Ship not found" });
    }

    if (action === 'remove') {
      const crewIndex = ships[shipIndex].crew.findIndex(crewMember => crewMember.id === crewMemberId);
      if (crewIndex !== -1) {
        ships[shipIndex].crew.splice(crewIndex, 1);
      }
    }

    fs.writeFile(shipJsonPath, JSON.stringify(ships), "utf-8", (err) => {
      if (err) {
        return res.status(500).json({ error: "Error writing ships file" });
      }
      res.json({ message: "Ship updated", ships });
    });
  });
});

app.delete('/ships/:shipId/crew/:crewMemberId', (req, res) => {
  const { shipId, crewMemberId } = req.params;

  fs.readFile(shipJsonPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Error reading ships file' });
    }

    const ships = JSON.parse(data);
    const ship = ships.find(ship => ship.id === parseInt(shipId, 10));

    if (!ship) {
      return res.status(404).json({ error: 'Ship not found' });
    }

    const crewMemberIndex = ship.crew.findIndex(crewMember => crewMember.id === parseInt(crewMemberId, 10));

    if (crewMemberIndex === -1) {
      return res.status(404).json({ error: 'Crew member not found' });
    }

    ship.crew.splice(crewMemberIndex, 1);

    fs.writeFile(shipJsonPath, JSON.stringify(ships, null, 2), 'utf8', err => {
      if (err) {
        return res.status(500).json({ error: 'Error writing ships file' });
      }

      res.status(200).json({ message: 'Crew member removed', ship });
    });
  });
});

app.post('/ships/:shipId/crew/:crewMemberId/waitlist', (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Missing crew member name' });
  }

  fs.readFile('waitlist.json', 'utf-8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Error reading waitlist file' });
    }

    const waitlistData = JSON.parse(data);
    const waitlist = waitlistData.waitlist;
    const newId = Math.max(...waitlist.map(p => p.id)) + 1;
    waitlist.push({ id: newId, name: name });

    fs.writeFile('waitlist.json', JSON.stringify({ waitlist: waitlist }), 'utf-8', err => {
      if (err) {
        return res.status(500).json({ error: 'Error writing waitlist file' });
      }

      res.status(201).json({ message: 'Crew member added to waitlist', waitlist });
    });
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});


