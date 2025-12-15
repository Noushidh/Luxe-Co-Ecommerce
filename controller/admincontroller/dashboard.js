import admin from "../../models/adminmodel.js";

export const load_dashboard = (req, res) => {
  res.render("admin/layout", {
    title: "Dashboard",
    body: "./dashboard",
  });
};
