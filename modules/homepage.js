// ===== PAGE HTML GENERATORS =====
function getHomepageHTML() {
  return `
    <!-- stats -->
    <section class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <div class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5 card-hover">
        <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-400 dark:text-gray-500 font-medium">This is a flavor text to test the html</p>
          <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{48,295}</h3>
          <span class="inline-flex items-center text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full mt-1">
          <i class="fas fa-arrow-up mr-1"></i> 12.5%</span>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><i class="fas fa-dollar-sign text-2xl"></i></div></div>
      </div>
      <div class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5 card-hover">
        <div class="flex items-center justify-between"><div><p class="text-sm text-gray-400 dark:text-gray-500 font-medium">New Users</p><h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">1,283</h3><span class="inline-flex items-center text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full mt-1"><i class="fas fa-arrow-up mr-1"></i> 8.1%</span></div><div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400"><i class="fas fa-user-plus text-2xl"></i></div></div>
      </div>
      <div>
            <p class="text-sm text-gray-400 dark:text-gray-500 font-medium">Total Scripts</p>
            <h3 id="statTotalScripts" class="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">–</h3>
      </div>
      <div class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5 card-hover">
        <div class="flex items-center justify-between"><div><p class="text-sm text-gray-400 dark:text-gray-500 font-medium">Conversion</p><h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">3.24%</h3><span class="inline-flex items-center text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full mt-1"><i class="fas fa-arrow-up mr-1"></i> 1.2%</span></div><div class="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400"><i class="fas fa-percent text-2xl"></i></div></div>
      </div>
    </section>
  `;
}
