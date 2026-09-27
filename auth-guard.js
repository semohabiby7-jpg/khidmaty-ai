/* ===== AUTH GUARD — حماية الصفحات (لازم تسجيل دخول) ===== */
/* بيتم تشغيله في أول كل صفحة. لو المستخدم مش مسجل، بيحوّله لـ index.html#login */
(function(){
  // صفحات عامة (ممنوع تحميها): index.html فقط
  var publicPages = ['index.html',''];
  var path = window.location.pathname.split('/');
  var currentPage = path.pop() || 'index.html';

  // لو المستخدم مسجل (عنده token OR user data) → سيبه يكمّل
  if(localStorage.getItem('sb_token') || localStorage.getItem('sb_user')) return;

  // لو الصفحة عامة (index.html) → سيبها
  if(publicPages.indexOf(currentPage) !== -1) return;

  // حدد prefix المسار (services/ بتستخدم ../)
  var inServices = window.location.pathname.indexOf('/services/') !== -1;
  var prefix = inServices ? '../' : '';

  // حفظ الصفحة اللي كان عايزها عشان نرجعه بعد تسجيل الدخول
  try{ sessionStorage.setItem('redirect_after_login', window.location.href); }catch(e){}

  // redirect لـ index.html#login
  window.location.href = prefix + 'index.html#login';
})();
