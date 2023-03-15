
const waitlistForm = document.querySelector('#waitlist-form');

waitlistForm.addEventListener('submit', event => {
  event.preventDefault(); // Prevent the form from submitting normally

  const nameInput = document.querySelector('#name-input');
  const name = nameInput.value;

  addToWaitlist(name);  
  waitlistForm.reset(); // Clear the form inputs
});

// Get a reference to the waitlist table
const waitlistTable = document.querySelector('#waitlist-table-body');

// Add a click event listener to each "Remove" button in the table
waitlistTable.addEventListener('click', event => {
  if (event.target.tagName === 'BUTTON') {
    const name = event.target.getAttribute('data-name');
    removeFromWaitlist(name);
  }
});

const addShipForm = document.querySelector('#add-ship-form');

addShipForm.addEventListener('submit', event => {
  event.preventDefault(); // Prevent the form from submitting normally

  const shipNameInput = document.querySelector('#ship-name-input');
  const shipName = shipNameInput.value;

  const slotsDropdown = document.querySelector('#slots-dropdown');
  const openSlots = parseInt(slotsDropdown.value, 10);

  addShip(shipName, openSlots);
  addShipForm.reset(); // Clear the form inputs
});


async function addToWaitlist(name) {
  const data = { name: name };
  try {
    const response = await fetch('/add-to-waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const responseData = await response.json();
    console.log(responseData);
    const waitlist = await displayWaitlist();
    updateCrewDropdowns(waitlist);
  } catch (error) {
    console.error(error);
    // TODO: Handle error
  }
}

async function displayWaitlist() {
  try {
    const response = await fetch('/waitlist');
    const data = await response.json();

    const waitlistTable = document.querySelector('#waitlist-table-body');
    waitlistTable.innerHTML = '';

    let row = document.createElement('tr');
    let counter = 0;

    // Loop through each entry in the waitlist array
    data.waitlist.forEach(entry => {
      // Create a new cell for each property in the entry object
      Object.keys(entry).forEach(key => {
        const cell = document.createElement('td');
        cell.textContent = entry[key];
        row.appendChild(cell);
      });

      // Add a remove button to the entry
      const removeButtonCell = document.createElement('td');
      const removeButton = document.createElement('button');
      removeButton.textContent = 'Remove';
      removeButton.addEventListener('click', () => {
        removeFromWaitlist(entry.id);
      });
      removeButtonCell.appendChild(removeButton);
      row.appendChild(removeButtonCell);

      counter++;

      // Create a new row after every 4th entry
      if (counter % 4 === 0) {
        waitlistTable.appendChild(row);
        row = document.createElement('tr');
      }
    });

    // Add the last row to the table
    waitlistTable.appendChild(row);
    return data.waitlist;
  } catch (error) {
    console.error(error);
    // TODO: Handle error
  }
}

async function removeFromWaitlist(id) {
  try {
    const response = await fetch('/waitlist/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id })
    });

    const responseData = await response.json();
    console.log(responseData);
    const waitlist = await displayWaitlist();
    updateCrewDropdowns(waitlist);
  } catch (error) {
    console.error(error);
    // TODO: Handle error
  }
}

  function addShip(shipName, openSlots) {
    const data = { name: shipName, openSlots: openSlots };
    fetch("/add-ship", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        console.log(data);
        displayWaitlist().then((waitlist) => {
          displayShips(data.ships, waitlist);
        });
      })
      .catch((error) => {
        console.error(error);
        // TODO: Handle error, e.g., show an error message
      });
  }

  function createShipCard(name, openSlots) {
    const shipCard = document.createElement("div");
    shipCard.className = "ship-card";
  
    const shipName = document.createElement("h3");
    shipName.textContent = `Ship Name: ${name}`;
    shipCard.appendChild(shipName);
  
    const shipType = document.createElement("p");
  
    if (openSlots === 2) {
      shipType.textContent = "Ship Type: Sloop";
    } else if (openSlots === 3) {
      shipType.textContent = "Ship Type: Brigantine";
    } else if (openSlots === 4) {
      shipType.textContent = "Ship Type: Galleon";
    }
  
    shipCard.appendChild(shipType);
  
    return shipCard;
  }
  
  async function displayShips() {
    try {
      const shipsResponse = await fetch('/ships');
      const shipsData = await shipsResponse.json();
      let waitlist = await displayWaitlist(); // Changed const to let
  
      const shipList = document.querySelector('#ship-cards-container');
      shipList.innerHTML = '';
  
      shipsData.ships.forEach(ship => {
        const shipType = getShipType(ship.openSlots);
  
        const shipCard = document.createElement('div');
        shipCard.classList.add('ship-card');
  
        const shipName = document.createElement('h3');
        shipName.textContent = `${ship.name} (${shipType})`;
        shipCard.appendChild(shipName);
  
        const crewList = document.createElement('ul');
        crewList.classList.add('crew-list');
  
        ship.crew.forEach(crewMember => {
          const crewSlot = createCrewSlot(ship.id, crewMember);
          crewList.appendChild(crewSlot);
        });
  
        shipCard.appendChild(crewList);
  
        const removeShipButton = document.createElement('button');
        removeShipButton.textContent = 'Remove';
        removeShipButton.addEventListener('click', () => {
          removeShip(ship.id);
        });
        shipCard.appendChild(removeShipButton);
  
        const crewDropdown = document.createElement('select');
        crewDropdown.classList.add('crew-dropdown');
        crewDropdown.innerHTML = `<option value="">Add crew member...</option>`;
        waitlist.forEach(person => {
          const crewOption = document.createElement('option');
          crewOption.value = person.id;
          crewOption.textContent = person.name;
          crewDropdown.appendChild(crewOption);
        });
  
        crewDropdown.addEventListener('change', async event => {
          const personId = parseInt(event.target.value, 10);
          if (personId) {
            const removedPersonResponse = await removePersonFromWaitlist(personId);
            const removedPerson = removedPersonResponse.removedPerson;
  
            if (ship.crew.length < ship.openSlots) {
              const addCrewMemberResponse = await fetch(`/ships/${ship.id}/crew`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ crewMember: { id: personId, name: removedPerson.name } }),
              });
              const addCrewMemberData = await addCrewMemberResponse.json();
  
              if (addCrewMemberData.message === 'Crew member added') {
                const newCrewSlot = createCrewSlot(ship.id, removedPerson);
                crewList.appendChild(newCrewSlot);
  
                ship.crew.push({ id: removedPerson.id, name: removedPerson.name });
  
                waitlist = await displayWaitlist(); // Update the waitlist variable
                updateCrewDropdowns(waitlist); // Pass the updated waitlist
              } else {
                console.error('Error adding crew member to ship');
              }
            }
          }
        });
  
        shipCard.appendChild(crewDropdown);
        shipList.appendChild(shipCard);
      });
    } catch (error) {
      console.error(error);
      // TODO: Handle error
    }
  }
  
  async function removePersonFromWaitlist(id) {
    const response = await fetch('/waitlist/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id })
    });
  
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error('Error removing person from waitlist');
    }
  }

  function updateCrewDropdowns(waitlist) {
    const crewDropdowns = document.querySelectorAll('.crew-dropdown');
    crewDropdowns.forEach(dropdown => {
      const selectedIndex = dropdown.selectedIndex;
      dropdown.innerHTML = `<option value="">Add crew member...</option>`;
      waitlist.forEach(person => {
        const crewOption = document.createElement('option');
        crewOption.value = person.id;
        crewOption.textContent = person.name;
        dropdown.appendChild(crewOption);
      });
      dropdown.selectedIndex = selectedIndex;
    });
  }


  async function removeShip(id) {
    try {
      const response = await fetch('/ships/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id })
      });
  
      const data = await response.json();
      console.log(data);
      displayShips();
    } catch (error) {
      console.error(error);
      // TODO: Handle error
    }
  }

  async function removeCrewMember(shipId, crewMemberId) {
    try {
      const response = await fetch(`/ships/${shipId}/crew/${crewMemberId}`, {
        method: 'DELETE',
      });
  
      if (response.ok) {
        await displayShips();
      } else {
        // TODO: Handle error
      }
    } catch (error) {
      console.error(error);
      // TODO: Handle error
    }
  }
 
  async function addCrewMemberToWaitlist(shipId, crewMemberId, crewMemberName) {
    try {
      const response = await fetch(`/ships/${shipId}/crew/${crewMemberId}/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: crewMemberName }),
      });
  
      if (response.ok) {
        const responseData = await response.json();
        return responseData.waitlist;
      } else {
        // TODO: Handle error
      }
    } catch (error) {
      console.error(error);
      // TODO: Handle error
    }
  }

  function getShipType(openSlots) {
    switch (openSlots) {
      case 2:
        return 'Sloop';
      case 3:
        return 'Brigantine';
      case 4:
        return 'Galleon';
      default:
        return 'Unknown';
    }
  }

  function createRemoveButton(shipId, crewMember) {
    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
      if (crewMember) {
        removeCrewMember(shipId, crewMember.id);
      }
    });
  
    return removeButton;
  }

  function createAddToWaitlistButton(shipId, crewMember) {
    const addToWaitlistButton = document.createElement('button');
    addToWaitlistButton.textContent = 'Add Back to Waitlist';
    addToWaitlistButton.addEventListener('click', async () => {
      if (crewMember) {
        const updatedWaitlist = await addCrewMemberToWaitlist(shipId, crewMember.id, crewMember.name);
        updateCrewDropdowns(updatedWaitlist);
      }
    });
  
    return addToWaitlistButton;
  }
  
  function createCrewSlot(shipId, crewMember) {
    const crewSlot = document.createElement('li');
    crewSlot.classList.add('crew-slot');
  
    const crewName = document.createElement('span');
    crewSlot.appendChild(crewName);
  
    if (crewMember) {
      crewName.textContent = crewMember.name;
  
      const removeButton = createRemoveButton(shipId, crewMember);
      crewSlot.appendChild(removeButton);
  
      const addToWaitlistButton = createAddToWaitlistButton(shipId, crewMember);
      addToWaitlistButton.addEventListener('click', async () => {
        if (crewMember) {
          // Remove crew member from the ship
          await removeCrewMember(shipId, crewMember.id);
  
          // Add the removed crew member back to the waitlist
          await addToWaitlist(crewMember.name);
        }
      });
      crewSlot.appendChild(addToWaitlistButton);
    }
  
    return crewSlot;
  }

const darkModeToggle = document.querySelector('#dark-mode-toggle');
const body = document.querySelector('body');

darkModeToggle.addEventListener('click', () => {
  body.classList.toggle('dark-mode');
});