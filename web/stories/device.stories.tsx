import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { DevicePage } from "../src/pages/device";
import { english, json, loading, failure } from "./mocks";

const meta = {
  title: "Pages/Device",
  loaders: [english("device")],
  render: (_, { loaded }) => <DevicePage t={loaded.t} locale="en" />,
  parameters: {
    query: {
      user_code: "ABCD-EFGH",
      return_uri: "obsidian://synch-device-login",
    },
    msw: {
      handlers: [
        json("/api/auth/device", { status: "pending" }),
        http.post("*/api/auth/device/:decision", () =>
          HttpResponse.json({ ok: true }),
        ),
      ],
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Pending: Story = {};
export const Loading: Story = {
  parameters: { msw: { handlers: [loading("/api/auth/get-session")] } },
};
export const MissingCode: Story = { parameters: { query: { user_code: "" } } };
export const Approved: Story = {
  parameters: {
    msw: { handlers: [json("/api/auth/device", { status: "approved" })] },
  },
};
export const Denied: Story = {
  parameters: {
    msw: { handlers: [json("/api/auth/device", { status: "denied" })] },
  },
};
export const Error: Story = {
  parameters: { msw: { handlers: [failure("/api/auth/device")] } },
};
