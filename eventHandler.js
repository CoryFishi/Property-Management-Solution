// On reload hide errors
hideError();

/*----------------------------------------------------------------
                        Variable Declarations
----------------------------------------------------------------*/
const propertyID = localStorage.getItem("property_id"); // Retrieves the property ID from localStorage
const username = localStorage.getItem("username"); // Retrieves the username from localStorage
const password = localStorage.getItem("password"); // Retrieves the password from localStorage
const clientID = localStorage.getItem("client_id"); // Retrieves the client ID from localStorage
const secretID = localStorage.getItem("secret_id"); // Retrieves the secret ID from localStorage
const envKey = localStorage.getItem("environment"); // Retrieves the environment key from localStorage
// console.log(propertyID, username, password, clientID, secretID, envKey);
let bearerToken; // Holds the bearer token for authentication
let jsonData; // Holds JSON data fetched from APIs
let currentTime; // Holds the current time in milliseconds
let expirationTime; // Holds the expiration time of the bearer token
let timeUntilExpiration; // Holds the time until the bearer token expires
let unitImportError = []; // Holds import errors for units
let unitImportSuccess = []; // Holds import successes for units

/*----------------------------------------------------------------
                        Function Declarations
----------------------------------------------------------------*/
// Function to create a bearer token for authentication
async function createBearer(user, pass, id, secret) {
  currentTime = Date.now();
  fetch(`https://auth.insomniaccia${envKey}.com/auth/token`, {
    method: "POST",
    headers: {
      accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "password",
      username: user,
      password: pass,
      scope: "",
      client_id: id,
      client_secret: secret,
      refresh_token: "",
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Bearer network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      bearerToken = data;
      expirationTime = currentTime + data.expires_in * 1000;
    })
    .catch((error) => {
      console.error(
        "There was a problem with the bearer fetch operation:",
        error
      );
      showError(error);
    });
  displayLoadDateTime();
}

// Function to fetch facility data
async function getFacility() {
  fetch(
    `https://accesscontrol.insomniaccia${envKey}.com/facilities/${propertyID}`,
    {
      headers: {
        accept: "application/json",
        Authorization: "Bearer " + bearerToken.access_token,
        "api-version": "2.0",
      },
    }
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      var name = data;
      var facilityElement = document.getElementById("facilityName");
      facilityElement.textContent = name.name;
      if (facilityElement.href !== "#") {
        facilityElement.target = "_blank";
      }
      facilityElement.href = `https://portal.insomniaccia${envKey}.com/facility/${propertyID}/dashboard`;
    })
    .catch((error) => {
      console.error("There was a problem with the fetch operation:", error);
    });
}

// Function to show error fetching data
function showError(err) {
  const errText = document.getElementById("errText");
  //Check to see if error is already displayed
  if (errText.classList.contains("visible")) {
    console.log("Error already displayed");
    return;
  }
  // Check to see if error is defined or not
  if (err === undefined) {
    errText.textContent = "Error: Unable to fetch data";
  } else {
    errText.textContent = err;
  }
  console.log(err);
  errText.classList.remove("hidden");
  errText.classList.add("visible");
  hideLoadingSpinner();
}

// Function to hide error fetching data
function hideError() {
  var errText = document.getElementById("errText");
  errText.classList.remove("visible");
  errText.classList.add("hidden");
}

// Function to fetch unit list
async function unitList(num) {
  // console.log(bearerToken.access_token);
  fetch(
    `https://accesscontrol.insomniaccia${envKey}.com/facilities/${num}/units`,
    {
      headers: {
        Authorization: "Bearer " + (await bearerToken.access_token),
        accept: "application/json",
        "api-version": "2.0",
      },
    }
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      jsonData = data;
    })
    .catch((error) => {
      console.error("There was a problem with the fetch operation:", error);
    });
}

// Function to display unit data in a table
async function displayData() {
  var tableBody = document.querySelector("#jsonTable tbody");
  var response = null;
  if (jsonData === undefined) {
    showError();
  }
  async function handleAction(row, action) {
    switch (action) {
      case "Turn Delinquent":
        response = await addDelinquent(row.cells[0].textContent);
        if (response) {
          row.cells[2].textContent = "Delinquent";
          row.deleteCell(8);
          updateButtons(row, "Delinquent");
          hideLoadingSpinner();
        } else {
          console.error("Network request failed:", response.statusText);
          hideLoadingSpinner();
        }
        break;
      case "Turn Rented":
        response = await removeDelinquent(row.cells[0].textContent);
        if (response) {
          row.cells[2].textContent = "Rented";
          row.deleteCell(8);
          updateButtons(row, "Rented");
          hideLoadingSpinner();
        } else {
          console.error("Network request failed:", response.statusText);
          hideLoadingSpinner();
        }
        break;
      case "Move Out":
        response = await removeVisitor(row.cells[0].textContent);
        if (response) {
          row.cells[2].textContent = "Vacant";
          row.deleteCell(8);
          updateButtons(row, "Vacant");
          hideLoadingSpinner();
        } else {
          console.error("Network request failed:", response.statusText);
          hideLoadingSpinner();
        }
        break;
      case "Move In":
        response = await addVisitor(row.cells[0].textContent);
        if (response) {
          row.cells[2].textContent = "Rented";
          row.deleteCell(8);
          updateButtons(row, "Rented");
          hideLoadingSpinner();
        } else {
          console.error("Network request failed:", response.statusText);
          hideLoadingSpinner();
        }
        break;
      case "Delete":
        response = await removeUnit(row.cells[0].textContent);
        if (response) {
          row.parentNode.removeChild(row);
          hideLoadingSpinner();
        } else {
          console.error("Network request failed:", response.statusText);
          hideLoadingSpinner();
        }
        break;
      default:
        // No action for other statuses
        break;
    }
  }
  var buttons = [];
  function updateButtons(row, status) {
    buttons = [];
    switch (status) {
      case "Rented":
        buttons.push("Turn Delinquent");
        buttons.push("Move Out");
        break;
      case "Delinquent":
        buttons.push("Turn Rented");
        buttons.push("Move Out");
        break;
      case "Vacant":
        buttons.push("Move In");
        buttons.push("Delete");
        break;
      default:
        buttons.push("This is broken");
        break;
    }
    var buttonCell = row.insertCell();
    buttons.forEach(function (buttonText) {
      var updateButton = document.createElement("button");
      updateButton.textContent = buttonText;
      updateButton.className = "update-button";
      updateButton.addEventListener("click", function () {
        handleAction(row, buttonText);
      });
      buttonCell.appendChild(updateButton);
      if (updateButton.textContent.trim() === "Delete") {
        updateButton.classList.add("delete-button");
      }
      if (updateButton.textContent.trim() === "Move Out") {
        updateButton.classList.add("out-button");
      }
      if (updateButton.textContent.trim() === "Turn Delinquent") {
        updateButton.classList.add("addDelinquent-button");
      }
    });
  }
  jsonData.forEach(function (item) {
    var row = tableBody.insertRow();
    row.insertCell().textContent = item.id;
    row.insertCell().textContent = item.unitNumber;
    row.insertCell().textContent = item.status;
    row.insertCell().textContent = item.facilityId;
    row.insertCell().textContent = item.propertyNumber;
    row.insertCell().textContent = item.extendedData.additionalProp1;
    row.insertCell().textContent = item.extendedData.additionalProp2;
    row.insertCell().textContent = item.extendedData.additionalProp3;
    var buttonCell = row.insertCell();
    buttons = [];
    switch (item.status) {
      case "Rented":
        buttons.push("Turn Delinquent");
        buttons.push("Move Out");
        break;
      case "Delinquent":
        buttons.push("Turn Rented");
        buttons.push("Move Out");
        break;
      case "Vacant":
        buttons.push("Move In");
        buttons.push("Delete");
        break;
      default:
        buttons.push("This is broken");
        break;
    }
    buttons.forEach(function (buttonText) {
      var updateButton = document.createElement("button");
      updateButton.textContent = buttonText;
      updateButton.className = "update-button";
      updateButton.addEventListener("click", function () {
        handleAction(row, buttonText);
      });
      buttonCell.appendChild(updateButton);
      if (updateButton.textContent.trim() === "Delete") {
        updateButton.classList.add("delete-button");
      }
      if (updateButton.textContent.trim() === "Move Out") {
        updateButton.classList.add("out-button");
      }
      if (updateButton.textContent.trim() === "Turn Delinquent") {
        updateButton.classList.add("addDelinquent-button");
      }
    });
  });
}

// Function to add a unit
async function addUnit(unit) {
  try {
    const response = await fetch(
      `https://accesscontrol.insomniaccia${envKey}.com/facilities/${propertyID}/units`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-version": "2.0",
          Authorization: "Bearer " + bearerToken.access_token,
          "Content-Type": "application/json-patch+json",
        },
        body: JSON.stringify({
          unitNumber: unit,
          extendedData: {
            additionalProp1: null,
            additionalProp2: null,
            additionalProp3: null,
          },
          suppressCommands: true,
        }),
      }
    );
    if (response.ok) {
      const data = await response.json();
      return true;
    } else {
      throw new Error("Network response was not ok");
    }
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    return false;
  }
}

// Function to remove a unit
async function removeUnit(unit) {
  showLoadingSpinner();
  try {
    const response = await fetch(
      `https://accesscontrol.insomniaccia${envKey}.com/facilities/${propertyID}/units/${unit}/delete/vacant?suppressCommands=true`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-version": "2.0",
          Authorization: "Bearer " + bearerToken.access_token,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: "",
      }
    );
    if (response.ok) {
      hideLoadingSpinner();
      return true;
    } else {
      throw new Error("Network response was not ok");
    }
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    alert(error.message);
    hideLoadingSpinner();
    return false;
  }
}

// Function to generate a random access code for the addVisitor function
function generateRandomCode(length) {
  let max = Math.pow(10, length) - 1;
  let randNum = Math.floor(Math.random() * (max + 1));
  let randCode = randNum.toString().padStart(length, "0");
  return randCode;
}

// Function to add a visitor
async function addVisitor(unit) {
  showLoadingSpinner();
  try {
    const response = await fetch(
      `https://accesscontrol.insomniaccia${envKey}.com/facilities/${propertyID}/visitors`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-version": "2.0",
          Authorization: "Bearer " + bearerToken.access_token,
          "Content-Type": "application/json-patch+json",
        },
        body: JSON.stringify({
          timeGroupId: 0,
          accessProfileId: 0,
          unitId: unit,
          accessCode: generateRandomCode(4),
          lastName: "Tenant",
          firstName: "Fake",
          email: "test@example.com",
          mobilePhoneNumber: generateRandomCode(10),
          isTenant: true,
          extendedData: {
            additionalProp1: null,
            additionalProp2: null,
            additionalProp3: null,
          },
          suppressCommands: true,
        }),
      }
    );
    if (response.ok) {
      hideLoadingSpinner();
      return true;
    } else {
      throw new Error("Network response was not ok");
    }
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    alert(error.message);
    hideLoadingSpinner();
    return false;
  }
}
// Function to remove a visitor
async function removeVisitor(unit) {
  showLoadingSpinner();
  try {
    const response = await fetch(
      `https://accesscontrol.insomniaccia${envKey}.com/facilities/${propertyID}/units/${unit}/vacate?suppressCommands=true`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-version": "2.0",
          Authorization: "Bearer " + bearerToken.access_token,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: "",
      }
    );
    if (response.ok) {
      hideLoadingSpinner();
      return true;
    } else {
      throw new Error("Network response was not ok");
    }
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    alert(error.message);
    hideLoadingSpinner();
    return false;
  }
}

// Function to mark a unit as delinquent
async function addDelinquent(unit) {
  showLoadingSpinner();
  try {
    const response = await fetch(
      `https://accesscontrol.insomniaccia${envKey}.com/facilities/${propertyID}/units/${unit}/disable?suppressCommands=true`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-version": "2.0",
          Authorization: "Bearer " + bearerToken.access_token,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: "",
      }
    );
    if (response.ok) {
      hideLoadingSpinner();
      return true;
    } else {
      throw new Error("Network response was not ok");
    }
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    alert(error.message);
    hideLoadingSpinner();
    return false;
  }
}

// Function to mark a delinquent unit as active
async function removeDelinquent(unit) {
  showLoadingSpinner();
  try {
    const response = await fetch(
      `https://accesscontrol.insomniaccia${envKey}.com/facilities/${propertyID}/units/${unit}/enable?suppressCommands=true`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-version": "2.0",
          Authorization: "Bearer " + bearerToken.access_token,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: "",
      }
    );
    if (response.ok) {
      hideLoadingSpinner();
      return true;
    } else {
      throw new Error("Network response was not ok");
    }
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    alert(error.message);
    hideLoadingSpinner();
    return false;
  }
}

// Event listener for adding a unit
document.getElementById("unitButton").addEventListener(
  "click",
  async function () {
    unitImportError = [];
    unitImportSuccess = [];
    var userInput = prompt("Unit Number(s):", "");
    if (userInput === null) {
      return false;
    }
    unitArray = userInput.split(/\s+/);

    showLoadingSpinner();
    for (let i = 0; i < unitArray.length; i++) {
      const unit = unitArray[i];
      if (unit.length > 9) {
        unitImportError.push(unit);
      } else {
        const success = await addUnit(unit);
        if (success) {
          unitImportSuccess.push(unit);
        } else {
          unitImportError.push(unit);
        }
      }
    }

    if (unitImportError.length !== 0) {
      alert("Unable to import units: " + unitImportError);
    }
    if (unitImportSuccess.length !== 0) {
      alert("Imported units: " + unitImportSuccess);
      refreshTable();
    }
    hideLoadingSpinner();
  },
  false
);

// Function to format date and time
function formatDate(date) {
  var options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZoneName: "short",
  };
  return date.toLocaleDateString(undefined, options);
}

// Function to display the page load date and time
function displayLoadDateTime() {
  var loadDateTimeElement = document.getElementById("loadDateTime");
  var loadDateTime = new Date();
  loadDateTimeElement.textContent = "Last Refresh: " + formatDate(loadDateTime);
}

// Function to sort the table
function sortTable(columnIndex) {
  var table,
    rows,
    switching,
    i,
    x,
    y,
    shouldSwitch,
    dir,
    switchcount = 0;
  table = document.getElementById("jsonTable");
  switching = true;
  dir = "asc";
  while (switching) {
    switching = false;
    rows = table.rows;
    for (i = 1; i < rows.length - 1; i++) {
      shouldSwitch = false;
      x = rows[i].getElementsByTagName("TD")[columnIndex];
      y = rows[i + 1].getElementsByTagName("TD")[columnIndex];
      if (dir == "asc") {
        if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
          shouldSwitch = true;
          break;
        }
      } else if (dir == "desc") {
        if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
          shouldSwitch = true;
          break;
        }
      }
    }
    if (shouldSwitch) {
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
      switchcount++;
    } else {
      if (switchcount == 0 && dir == "asc") {
        dir = "desc";
        switching = true;
      }
    }
  }
}

// Function to refresh the json table
async function refreshTable() {
  showLoadingSpinner();
  hideError();
  var table = document.getElementById("jsonTable");
  for (var i = table.rows.length - 1; i > 0; i--) {
    table.deleteRow(i);
  }
  setTimeout(() => {
    unitList(propertyID);
  }, 500);
  setTimeout(() => {
    displayData();
    getFacility();
    hideLoadingSpinner();
  }, 1000);
  setTimeout(() => {
    sortTable(1);
  }, 1005);
  setTimeout(() => {
    displayLoadDateTime();
  }, 1005);
}

// Function to show loading spinner
function showLoadingSpinner() {
  const spinner = document.getElementById("loading-spinner");
  spinner.classList.remove("hidden");
  spinner.classList.add("visible");
}

// Function to hide loading spinner
function hideLoadingSpinner() {
  const spinner = document.getElementById("loading-spinner");
  spinner.classList.remove("visible");
  spinner.classList.add("hidden");
}

// On webpage load function
async function onWebLoad() {
  // Show loading spinner
  showLoadingSpinner();
  
  // Create bearer token
  await createBearer(username, password, clientID, secretID);
  
  // Get unit data
  await new Promise(resolve => setTimeout(resolve, 1000));
  await unitList(propertyID);
  
  // Get the facility name and display it
  await new Promise(resolve => setTimeout(resolve, 1000));
  await getFacility();
  
  // Display the unit table
  await new Promise(resolve => setTimeout(resolve, 1000));
  await displayData();
  
  // Hide loading spinner
  hideLoadingSpinner();
  
  // Sort the table
  sortTable(1);

  // Show load date
  displayLoadDateTime();
}


/*----------------------------------------------------------------
                        On window load
----------------------------------------------------------------*/
onWebLoad();

//reload the page every 30 minutes in order to refresh the bearer token and validate data
setTimeout(() => {
  location.reload();
}, 1800000);
