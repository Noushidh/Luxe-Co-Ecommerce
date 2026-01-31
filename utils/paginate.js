export const paginate = async (Model, page = 1, limit = 10, query = {}) => {
    const skip = (page - 1) * limit;

    const results = await Model.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    const total = await Model.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return {
        results,total,totalPages,currentPage: page
     };
};
