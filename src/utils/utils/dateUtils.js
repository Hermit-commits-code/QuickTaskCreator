// utils/dateUtils.js
function parseSlackDate(dateStr) {
  // Accepts MM-DD-YYYY or YYYY-MM-DD
  if (!dateStr) return null;
  let d = null;
  if (/\d{2}-\d{2}-\d{4}/.test(dateStr)) {
    // MM-DD-YYYY
    const [mm, dd, yyyy] = dateStr.split("-");
    d = new Date(`${yyyy}-${mm}-${dd}`);
  } else if (/\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    // YYYY-MM-DD
    d = new Date(dateStr);
  }
  return isNaN(d?.getTime()) ? null : d;
}

module.exports = { parseSlackDate };
