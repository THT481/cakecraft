// Contact / generic page
import { injectChrome } from './partials.js';
import { wireShared, loadCatalog, ensureSeed, showToast, confettiBurst, $ } from './core.js';

injectChrome();
wireShared();
loadCatalog();
 ensureSeed();

// Contact form (demo — no backend send)
$('#contactSend')?.addEventListener('click', () => {
  const name = $('#cName')?.value.trim(), email = $('#cEmail')?.value.trim(), msg = $('#cMsg')?.value.trim();
  if (!name || !email || !msg) { showToast('Vui lòng điền đủ thông tin', 'warning'); return; }
  showToast('Đã gửi lời nhắn! Chúng tôi sẽ liên hệ với bạn sớm', 'success');
  confettiBurst(50);
  if ($('#cName')) $('#cName').value = '';
  if ($('#cEmail')) $('#cEmail').value = '';
  if ($('#cMsg')) $('#cMsg').value = '';
});
