
export const getReadyProductFilter = (extraCriteria = {}) => {
    return {
        isBlocked: false,
        variants: { 
            $exists: true, 
            $not: { $size: 0 } 
        },
        "variants.images": { 
            $exists: true, 
            $not: { $size: 0 } 
        },
        ...extraCriteria
    };
};