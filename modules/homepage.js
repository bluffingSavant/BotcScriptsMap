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
      <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><i class="fas fa-dollar-sign text-2xl"></i></div></div>
    </div>
  `;
}


function initHomePage() {
  if (!window.chartInstances) window.chartInstances = {};
  const div = document.getElementById('textDiv');
  if (div) {
    div.innerHTML = `
      This website allows you to load scripts from https://www.botcscripts.com and compare their content. To this date, there are 2 tools:
      <ul style="margin-top: 8px; padding-left: 20px; list-style-type: disc;">
        <li>Script similarity: Find most similar scripts to the Base 3 and see what changes from the base script.</li>
        <li>Character combinations: Find scripts where all the requested characters appear.</li>
      </ul>
      
      This is still Work In Progress and suggestions are welcome on the reddit thread -> 
    `;
  }
}
