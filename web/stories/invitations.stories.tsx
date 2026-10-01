import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { InvitationsPage } from "../src/pages/invitations";
import { english, json, loading } from "./mocks";

const detail = {
  organizationId: "studio",
  organizationName: "Design studio",
  role: "member",
  status: "pending",
  vaults: [{ vaultId: "research", name: "Research & shared knowledge" }],
};
const meta = {
  title: "Pages/Invitations",
  loaders: [english("invitations")],
  render: (_, { loaded }) => <InvitationsPage t={loaded.t} locale="en" />,
  parameters: {
    query: { invitationId: "invite" },
    msw: {
      handlers: [
        json("/v1/invitations/invite", detail),
        http.post("*/v1/invitations/invite/:action", () =>
          HttpResponse.json({ organizationId: "studio" }),
        ),
      ],
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Pending: Story = {};
export const Loading: Story = {
  parameters: { msw: { handlers: [loading("/v1/invitations/invite")] } },
};
export const Accepted: Story = {
  parameters: {
    msw: {
      handlers: [
        json("/v1/invitations/invite", { ...detail, status: "accepted" }),
      ],
    },
  },
};
export const Expired: Story = {
  parameters: {
    msw: {
      handlers: [
        json("/v1/invitations/invite", { ...detail, status: "expired" }),
      ],
    },
  },
};
export const Rejected: Story = {
  parameters: {
    msw: {
      handlers: [
        json("/v1/invitations/invite", { ...detail, status: "rejected" }),
      ],
    },
  },
};
export const WrongAccount: Story = {
  parameters: { msw: { handlers: [json("/v1/invitations/invite", {}, 403)] } },
};
export const MissingInvitation: Story = {
  parameters: { query: { invitationId: "" } },
};
