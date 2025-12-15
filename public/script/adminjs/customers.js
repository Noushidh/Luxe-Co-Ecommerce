    import { toggleStatus } from "/js/utils/toggleStatus.js";

    let typingTimer;
    let selectedUserId = null;
    let selectedUserBlocked = null;

    // aauto Search
    window.autoSearch = function () {
        clearTimeout(typingTimer)
        typingTimer = setTimeout(() => document.getElementById("searchForm").submit(), 1000)
    };

    // Open modal
    window.confirmToggle = function (id, isBlocked) {
        selectedUserId = id;
        selectedUserBlocked = isBlocked;

        const message = isBlocked
            ? "Are you sure you want to unblock this user?"
            : "Are you sure you want to block this user?";

        document.getElementById("blockMessage").innerText = message;

        document.getElementById("blockModal").classList.remove("hidden");
        document.getElementById("blockModal").classList.add("flex");
    };

    window.closeBlockModal = function () {
        document.getElementById("blockModal").classList.add("hidden");
        document.getElementById("blockModal").classList.remove("flex");

        selectedUserId = null;
        selectedUserBlocked = null;
    };

    // Confirm btn 
    document.getElementById("confirmBlockBtn").addEventListener("click", () => {
        window.toggleBlock(selectedUserId);
        window.closeBlockModal();
    });
    //block unblock
    window.toggleBlock = function (id) {
        toggleStatus({
            id: id, url: "/admin/user",
            successMessages: {
                block: "User Blocked Successfully",
                unblock: "User Unblocked Successfully",
            },
            errorMessage: "Failed to update user status",
        });
    };

 window.applyFilters = function () {
    const status = document.getElementById("filterStatus").value;
    const alpha = document.getElementById("filterAlpha").value;
    const search = document.getElementById("search") ? document.getElementById("search").value : "";
    window.location.href = `/admin/customers?status=${status}&alpha=${alpha}&search=${encodeURIComponent(search)}`;
};
window.resetFilters = function () {
    window.location.href = "/admin/customers";
};