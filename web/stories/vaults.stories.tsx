import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { VaultsPage } from "../src/pages/vaults";
import { english, json, loading, failure, organization, vaults } from "./mocks";

const meta = {
  title: "Pages/Vaults",
  loaders: [english("vaults")],
  render: (_, { loaded }) => <VaultsPage t={loaded.t} locale="en" />,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Loading: Story = {
  parameters: { msw: { handlers: [loading("/v1/organizations")] } },
};
export const Empty: Story = {
  parameters: { msw: { handlers: [json("/v1/vaults", { vaults: [] })] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("heading", { name: "Start syncing your Obsidian vault" });
    await expect(canvas.getByRole("link", { name: "Get Synch for Obsidian" })).toBeVisible();
    await expect(canvas.getByText(/sign in with alex@example.com/)).toBeVisible();
    await expect(canvas.queryByRole("region", { name: "Design studio" })).not.toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: "Create on the web instead" })).not.toBeInTheDocument();
  },
};
export const EmptyMobile: Story = {
  ...Empty,
  globals: { viewport: { value: "mobile", isRotated: false } },
};
export const Error: Story = {
  parameters: { msw: { handlers: [failure("/v1/vaults")] } },
};
export const DeletionStates: Story = {
  parameters: {
    msw: {
      handlers: [
        json("/v1/vaults", {
          vaults: [
            { ...vaults[0], deletionStatus: "queued" },
            { ...vaults[0], id: "running", name: "Old archive", deletionStatus: "running" },
            {
              ...vaults[1],
              deletionStatus: "failed",
              deletionError: "Deletion could not finish. Please try again.",
            },
          ],
        }),
      ],
    },
  },
};
export const CreateDialog: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Personal notes");
    await userEvent.click(canvas.getByRole("button", { name: "Create vault" }));
  },
};
export const DeleteDialog: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Personal notes");
    await userEvent.click(canvas.getByLabelText("Actions for Personal notes"));
    await userEvent.click(canvas.getByRole("button", { name: "Delete" }));
  },
};

export const NoManagedOrganization: Story = {
  parameters: { msw: { handlers: [json("/v1/organizations", {
    organizations: [{ id: "member-only", name: "Shared team", role: "member" }],
  })] } },
};
export const LongNames: Story = {
  parameters: { msw: { handlers: [json("/v1/vaults", {
    vaults: [{ ...vaults[0], name: "Research-archive-and-shared-project-documentation-with-a-very-long-unbroken-name" }],
  })] } },
};
export const Mobile: Story = {
  ...DeletionStates,
  globals: { viewport: { value: "mobile", isRotated: false } },
};

const secondOrganization = { ...organization, id: "team", name: "Product team", role: "admin" as const };
const emptyOrganization = { ...organization, id: "archive", name: "Archive" };
export const MultipleOrganizations: Story = {
  parameters: {
    msw: { handlers: [
      json("/v1/organizations", { organizations: [organization, secondOrganization, emptyOrganization] }),
      json("/v1/organizations/team", secondOrganization),
      json("/v1/organizations/archive", emptyOrganization),
      json("/v1/vaults", { vaults: [...vaults, { ...vaults[0], id: "team-notes", name: "Team notes", organizationId: "team" }] }),
    ] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Team notes");
    await expect(canvas.getByText("Personal notes")).toBeVisible();
    await expect(canvas.queryByRole("combobox")).not.toBeInTheDocument();
    await expect(canvas.getAllByRole("button", { name: "Create vault" })).toHaveLength(3);
  },
};
export const MultipleOrganizationsMobile: Story = {
  ...MultipleOrganizations,
  globals: { viewport: { value: "mobile", isRotated: false } },
};

export const AccountMenu: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Personal notes");
    await userEvent.click(canvas.getByLabelText("Alex Morgan"));
    await expect(canvas.getByText("alex@example.com")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Sign out" })).toBeVisible();
  },
};
