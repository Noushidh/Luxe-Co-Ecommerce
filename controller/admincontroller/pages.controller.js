export const page_404 = (req, res) => {
    res.render("admin/layout", {
        title: "Page Not Found",
        body: "pages/page-404"
    });
}
