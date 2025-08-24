document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const searchInput = document.getElementById("search-input");
  const sortSelect = document.getElementById("sort-select");

  // Store activities data globally
  let activitiesData = {};

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      
      // Store the activities data
      activitiesData = activities;
      
      // Render activities with current filter/sort settings
      renderActivities();
      
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Function to render activities based on current filter and sort settings
  function renderActivities() {
    // Clear current content
    activitiesList.innerHTML = "";
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

    // Get current filter and sort values
    const searchTerm = searchInput.value.toLowerCase().trim();
    const sortBy = sortSelect.value;

    // Filter activities
    let filteredActivities = Object.entries(activitiesData);
    
    if (searchTerm) {
      filteredActivities = filteredActivities.filter(([name, details]) =>
        name.toLowerCase().includes(searchTerm) ||
        details.description.toLowerCase().includes(searchTerm)
      );
    }

    // Sort activities
    filteredActivities.sort(([nameA, detailsA], [nameB, detailsB]) => {
      switch (sortBy) {
        case "name":
          return nameA.localeCompare(nameB);
        case "name-desc":
          return nameB.localeCompare(nameA);
        case "availability":
          const spotsA = detailsA.max_participants - detailsA.participants.length;
          const spotsB = detailsB.max_participants - detailsB.participants.length;
          return spotsB - spotsA; // More spots first
        case "availability-desc":
          const spotsA2 = detailsA.max_participants - detailsA.participants.length;
          const spotsB2 = detailsB.max_participants - detailsB.participants.length;
          return spotsA2 - spotsB2; // Fewer spots first
        case "schedule":
          return detailsA.schedule.localeCompare(detailsB.schedule);
        default:
          return nameA.localeCompare(nameB);
      }
    });

    // Render filtered and sorted activities
    filteredActivities.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;

      // Create participants HTML with delete icons instead of bullet points
      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
            <h5>Participants:</h5>
            <ul class="participants-list">
              ${details.participants
                .map(
                  (email) =>
                    `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                )
                .join("")}
            </ul>
          </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;

      activitiesList.appendChild(activityCard);

      // Add option to select dropdown (all original activities, not filtered)
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });

    // Show "no results" message if no activities match filter
    if (filteredActivities.length === 0) {
      activitiesList.innerHTML = "<p><em>No activities match your search criteria.</em></p>";
    }

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });

    // Populate activity select dropdown with all activities (not filtered)
    Object.keys(activitiesData).forEach(name => {
      const existingOption = Array.from(activitySelect.options).find(opt => opt.value === name);
      if (!existingOption) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      }
    });
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Add event listeners for filter and sort controls
  searchInput.addEventListener("input", renderActivities);
  sortSelect.addEventListener("change", renderActivities);

  // Initialize app
  fetchActivities();
});
