import { mount } from "../mount";
import { AuthPage } from "../pages/auth";
void mount<"signin" | "signup">(
  "signup",
  (props) => <AuthPage {...props} mode="signup" />,
  "submit",
);
