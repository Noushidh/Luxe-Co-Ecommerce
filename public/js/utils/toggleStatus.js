
export async function toggleStatus({id,url,successMessages,errorMessage}) {

    const notyf = new Notyf({ position: { x: "right", y: "top" } });

    try {
        const response = await axios.patch(`${url}/${id}/toggle-block`);

        if (response.data.success) {
            const isBlocked = response.data.isBlocked;

            document.getElementById(`status-${id}`).innerHTML =isBlocked
                    ? `<span class="px-3 py-1 text-xs bg-red-500 text-white rounded-full">Blocked</span>`
                    : `<span class="px-3 py-1 text-xs bg-green-500 text-white rounded-full">Active</span>`;

            const btn = document.getElementById(`btn-${id}`);
            btn.innerText = isBlocked ? "Unblock" : "Block";
            btn.className = `px-3 py-1 text-white text-xs rounded ${
                isBlocked ? "bg-green-500" : "bg-red-500"
            }`;
            notyf.success(isBlocked ? successMessages.block : successMessages.unblock);
        }
    } catch (error) {
        notyf.error(errorMessage);
    }
}
