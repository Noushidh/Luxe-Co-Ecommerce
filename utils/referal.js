

export const generateReferralCode = (name) => {
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
    const namePart = name.substring(0, 3).toUpperCase();
    return `${namePart}${randomStr}`; 
};