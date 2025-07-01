import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/login", "routes/login.tsx"),
  route("/editor", "routes/editor.tsx"),
  route("*", "routes/404.tsx"),
] satisfies RouteConfig;
