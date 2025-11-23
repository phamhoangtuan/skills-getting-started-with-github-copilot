document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // helper: derive initials from a name or email
  function getInitials(text) {
    if (!text) return "";
    const core = text.includes("@") ? text.split("@")[0] : text;
    const parts = core.split(/[.\s_-]+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // helper: display-friendly name (use local-part of email when needed)
  function displayName(text) {
    if (!text) return "";
    if (text.includes("@")) return text.split("@")[0];
    return text;
  }

  // Function to fetch activities from API (replaced to include participants UI)
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select options (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // basic info
        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // participants section
        const participantsDiv = document.createElement("div");
        participantsDiv.className = "participants";
        participantsDiv.setAttribute("aria-label", "Participants");
        const heading = document.createElement("h5");
        heading.textContent = "Participants";
        participantsDiv.appendChild(heading);

        if (details.participants && details.participants.length > 0) {
          const ul = document.createElement("ul");
          ul.className = "participants-list";

          details.participants.forEach((p) => {
            const li = document.createElement("li");

            const avatar = document.createElement("span");
            avatar.className = "avatar";
            avatar.textContent = getInitials(p);

            const spanName = document.createElement("span");
            spanName.className = "name";
            spanName.textContent = displayName(p);

            // delete/unregister button
            const del = document.createElement("button");
            del.className = "delete-btn";
            del.setAttribute("aria-label", `Unregister ${displayName(p)}`);
            del.title = "Unregister";
            del.textContent = "✖";
            del.addEventListener("click", async () => {
              // send unregister request
              try {
                const res = await fetch(
                  `/activities/${encodeURIComponent(name)}/unregister?email=${encodeURIComponent(p)}`,
                  { method: "POST" }
                );

                const result = await res.json();

                if (res.ok) {
                  // refresh activities to update UI
                  fetchActivities();
                } else {
                  messageDiv.textContent = result.detail || "Failed to unregister";
                  messageDiv.className = "error";
                  messageDiv.classList.remove("hidden");
                  setTimeout(() => messageDiv.classList.add("hidden"), 5000);
                }
              } catch (err) {
                console.error("Unregister error:", err);
                messageDiv.textContent = "Failed to unregister. Please try again.";
                messageDiv.className = "error";
                messageDiv.classList.remove("hidden");
                setTimeout(() => messageDiv.classList.add("hidden"), 5000);
              }
            });

            li.appendChild(avatar);
            li.appendChild(spanName);
            li.appendChild(del);

            ul.appendChild(li);
          });

          participantsDiv.appendChild(ul);
        } else {
          const none = document.createElement("div");
          none.className = "no-participants";
          none.textContent = "No participants yet — be the first to sign up!";
          participantsDiv.appendChild(none);
        }

        activityCard.appendChild(participantsDiv);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // update activities UI immediately so no refresh is needed
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

  // Initialize app
  fetchActivities();
});
