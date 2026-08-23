function getScriptsSimilarityHTML() {
  //<section class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5">
  return `
    <section class="bg-white dark:bg-[#1f2937] grid grid-cols-3 sm:grid-cols-3 xl:grid-cols-3 gap-0 rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5">
        <div id="TB" class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5 card-hover">
            <div class="w-50 h-50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <img src="icons/scripts/TB_logo.webp" alt="Trouble Brewing"></div></div>
        </div>
        <div id="BMR" class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5 card-hover">
            <div class="w-50 h-50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <img src="icons/scripts/BMR_logo.webp" alt="Bad Moon Rising"></div></div>
        </div>
        <div id="SnV" class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5 card-hover">
            <div class="w-50 h-50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <img src="icons/scripts/SnV_logo.webp" alt="Sects and Violets"></div></div>
        </div>
    </section>
  `;
}


function initScriptSimilarity(page) {
    if (!window.chartInstances) window.chartInstances = {};

}