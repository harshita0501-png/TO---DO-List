# ⚡ Taskflow — Modern To-Do Web Application

Taskflow is a lightweight, responsive, and feature-rich task management app built using vanilla JavaScript, HTML, and CSS. It offers local persistence, smooth UI transitions, filter/sort capabilities, and keyboard shortcuts.

![Taskflow Preview](https://via.placeholder.com/800x400/181c27/ffffff?text=Taskflow+To-Do+App) *(Optional: Replace with your actual screenshot link)*

---

## ✨ Features

- 🎯 **Task Management:** Create, check off, inline edit (double-click), or delete tasks.
- 🏷️ **Priority Levels:** Assign **High**, **Medium**, or **Low** priority tags with color coding.
- 🔍 **Real-time Search:** Instantly filter your list by task titles.
- ⚡ **Filter & Sort:**
  - **Filter:** View *All*, *Active*, or *Completed* tasks.
  - **Sort:** Order by *Newest*, *Oldest*, *Priority*, or *Alphabetical (A–Z)*.
- 📊 **Progress Bar & Stats:** Dynamic completion bar and active task counts.
- 💾 **Local Storage:** All tasks automatically save to your browser's `localStorage`.
- 🔔 **Toast Notifications:** Instant visual feedback when performing actions.
- 📱 **Fully Responsive:** Beautiful, dark-themed UI optimized for both desktop and mobile devices.

---

## 📁 Project Structure

Place all three files in the same project directory:

```text
taskflow/
├── index.html   # Main app layout & HTML structure
├── style.css    # Custom CSS variables, dark theme, and animations
└── script.js    # Application logic & LocalStorage handling