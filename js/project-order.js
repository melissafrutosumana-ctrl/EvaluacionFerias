export function sortProjectsByNewest(projects) {
    return [...(projects ?? [])].sort((left, right) => {
        const leftDate = Date.parse(left?.created_at ?? "");
        const rightDate = Date.parse(right?.created_at ?? "");

        if (Number.isFinite(leftDate) && Number.isFinite(rightDate)) {
            const dateOrder = rightDate - leftDate;
            if (dateOrder !== 0) return dateOrder;
        }

        const leftId = Number(left?.id);
        const rightId = Number(right?.id);

        if (Number.isFinite(leftId) && Number.isFinite(rightId)) {
            return rightId - leftId;
        }

        return 0;
    });
}
