// ===== PAGE HTML GENERATORS =====
function getHomepageHTML() {
  return `
    <!-- stats -->
    <div class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5 card-hover">
      <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-gray-400 dark:text-gray-500 font-medium">Welcome to Botc ScriptMap (WIP)</p>
        <h3 id="textDiv" class="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1"></h3>
      </div>
    </div>
  `;
}


function initHomePage() {
  if (!window.chartInstances) window.chartInstances = {};
  const div = document.getElementById('textDiv');
  if (div) {
    div.innerHTML = `
      This website allows you to load scripts from https://www.botcscripts.com and compare their content. To this date, there are 3 tools:
      <ul style="margin-top: 8px; padding-left: 20px; list-style-type: disc;">
        <li>Script similarity: Find most similar scripts to the Base 3 and see what changes from the base script.</li>
        <li>Character combinations: Find scripts where all the requested characters appear.</li>
        <li>Played on Youtube: Find videos from BloodOnTheClocktower, NoRollsBarred and Adventure Emporium where the scripts are played. For now the retrieval is automatic but incomplete. I'm working on retrieving them and associating them with the corresponding scripts.</li>
      </ul>
      <br />
      This is still Work In Progress and suggestions are welcome on the <a href=https://www.reddit.com/r/BloodOnTheClocktower/comments/1vx09zu/a_new_tool_to_find_scripts/><span style='color: red;'>reddit thread<span style='color: red;'></a>.<br />
      Last update of the database: 4 September 2026
    `;
  }
}
