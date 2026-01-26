export const globalErrorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Something went wrong on our end";

    console.error(`Status: ${statusCode} | Message: ${message}`);

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(statusCode).json({success: false,message: message});
    }

    const viewPath = req.originalUrl.startsWith('/admin') ? 'admin/pages/page-404' : 'user/pages/page-404';
    res.status(statusCode).render(viewPath, { message });
};