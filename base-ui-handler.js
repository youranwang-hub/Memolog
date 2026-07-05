// ...existing code...
document.getElementById('base-ui-_r_3_').addEventListener('click', () => {
    // ...existing code for logout...
    const action = prompt("请选择操作: 1. 退出登录 2. 修改密码");
    if (action === '2') {
        openChangePasswordDialog();
    } else if (action === '1') {
        // 执行退出登录逻辑
        logout();
    }
});
// ...existing code...

function openChangePasswordDialog() {
    // 打开修改密码对话框
    const dialog = document.getElementById('change-password-dialog');
    if (dialog) {
        dialog.style.display = 'block';
    }
}
