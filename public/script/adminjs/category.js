    import { toggleStatus } from "/js/utils/toggleStatus.js";

    let typingTimer;
    let selectedId = null;
    let selectedState = null;

    window.autoSearch = function () {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => document.getElementById("searchForm").submit(), 1000);
    }


    window.openCategoryModal = function () {
        categoryModal.classList.remove("hidden");
        categoryModal.classList.add("flex");
    }

    window.closeCategoryModal = function () {
        categoryModal.classList.add("hidden");
        categoryModal.classList.remove("flex");
    }

    window.addSubcategory = async function () {
        const notyf = new Notyf({ position: { x: "right", y: "top" } });

        const category = document.getElementById("categoryId").value;
        const subcategory = document.getElementById("subCategoryName").value;

        if (!category || !subcategory) {
            notyf.error("Please fill all fields");
            return;
        }

        try {
            const response = await axios.post("/admin/subcategory/add", { category, subcategory });

            if (response.data.success) {
                notyf.success(response.data.message);
                setTimeout(() => window.location.reload(), 800);
            } else {
                notyf.error(response.data.message)
            }
        } catch (error) {
            notyf.error("Failed to add subcategory");
        }
    }
    const editModal = document.getElementById("editModal");

    window.openEditModal = function (id, category, subcategory) {

        selectedId = id;
        document.getElementById("editCategory").value = category;
        document.getElementById("editSubCategoryName").value = subcategory;

        editModal.classList.remove("hidden");
        editModal.classList.add("flex");

    }
    window.closeEditModal = function () {
        editModal.classList.add("hidden");
        editModal.classList.remove("flex");
        selectedId = null;
    }

    window.updateSubcategory = async function () {
        const notyf = new Notyf({ position: { x: "right", y: "top" } });

        const subcategory = document.getElementById("editSubCategoryName").value;

        try {
            const response = await axios.patch(`/admin/subcategory/${selectedId}`, { subcategory: subcategory.trim() })
            if (response.data.success) {
                notyf.success(response.data.message);
                setTimeout(() => window.location.reload(), 800)
            }
        } catch (error) {
            if (error.response && error.response.data) {
                return notyf.error(error.response.data.message);
            }
            notyf.error("Failed to update subcategory");
        }
    }

    // Block / Unblock Confirmation Modal

    window.confirmToggle = function (id, isBlocked) {

        selectedId = id;
        selectedState = isBlocked;

        blockMessage.innerText = isBlocked
            ? "Are you sure you want to restore this subcategory?"
            : "Are you sure you want to block this subcategory?";

        blockModal.classList.remove("hidden");
        blockModal.classList.add("flex");
    }

    window.closeBlockModal = function () {
        blockModal.classList.add("hidden");
        blockModal.classList.remove("flex");
        selectedId = null;
        selectedState = null;
    }

    // Confirm button 
    confirmBlockBtn.addEventListener("click", async () => {
        await toggleBlock(selectedId);
        closeBlockModal();
    });




    // Toggle Block/Unblock Logic  

    window.toggleBlock = function (id) {
        toggleStatus({
            id: id,
            url: "/admin/subcategory",
            successMessages: {
                block: "Subcategory Blocked Successfully",
                unblock: "subcategory Unblocked Successfully",
            },
            errorMessage: "Failed to update user status",
        })
    }

