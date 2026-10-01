import { mount } from "../mount";
import { AuthPage } from "../pages/auth";
void mount<"signin" | "signup">(
  "signin",
  (props) => <AuthPage {...props} mode="signin" />,
  "submit",
);
