import { expect, test } from "@playwright/test";
import { bff, email, hidFromUrl, installApps, PASSWORD } from "./helpers";

test("register, create a household and reach the app's own backend from MF and iframe apps", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Зарегистрироваться" }).click();
  await page.getByLabel("Имя").fill("Анна");
  await page.getByLabel("Почта").fill(email("anna"));
  await page.getByLabel("Пароль").fill(PASSWORD);
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();

  await page.getByLabel("Название").fill("Дом Анны");
  await page.getByRole("button", { name: "Создать" }).click();
  await expect(page).toHaveURL(/\/h\/[^/]+$/);
  await expect(page.getByText("Анна", { exact: true })).toBeVisible();
  const hid = hidFromUrl(page.url());
  const householdPath = new URL(page.url()).pathname;
  await installApps(hid, ["recipes", "recipes-iframe"]);

  await page.goto(`${householdPath}/a/recipes`);
  await expect(page.getByRole("heading", { name: "Рецепты" })).toBeVisible();
  await page.getByRole("button", { name: "Проверить бэкенд" }).click();
  await expect(page.getByRole("status")).toHaveText("Бэкенд ответил: recipes (app:edit)");

  await page.goto(`${householdPath}/a/recipes-iframe`);
  const frame = page.frameLocator("iframe");
  await expect(frame.getByRole("heading", { name: "Рецепты" })).toBeVisible();
  await frame.getByRole("button", { name: "Проверить бэкенд" }).click();
  await expect(frame.getByRole("status")).toHaveText("Бэкенд ответил: recipes-iframe (app:edit)");

  const cookies = await page.context().cookies();
  expect(cookies.map((cookie) => cookie.name)).toEqual(["__Host-session"]);

  await page.getByRole("button", { name: "Выйти" }).click();
  await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
});

test("removing a member closes the app in their open tab without a reload", async ({ browser }) => {
  const ownerPage = await (await browser.newContext()).newPage();
  const memberPage = await (await browser.newContext()).newPage();
  await ownerPage.goto("/");
  await memberPage.goto("/");

  expect(
    (
      await bff(ownerPage, "/auth/signup", {
        name: "Олег",
        email: email("oleg"),
        password: PASSWORD,
      })
    ).status,
  ).toBe(200);
  const household = await bff(ownerPage, "/identity/api/auth/organization/create", {
    name: "Дом Олега",
    slug: `dom-olega-${Date.now()}`,
  });
  const hid: string = household.body.id;
  await installApps(hid, ["recipes"]);

  expect(
    (
      await bff(memberPage, "/auth/signup", {
        name: "Ира",
        email: email("ira"),
        password: PASSWORD,
      })
    ).status,
  ).toBe(200);
  const invite = await bff(ownerPage, "/identity/api/auth/organization/invite-member", {
    organizationId: hid,
    email: email("ira"),
    role: "member",
  });
  const accept = await bff(memberPage, "/identity/api/auth/organization/accept-invitation", {
    invitationId: invite.body.id,
  });
  const request = await bff(memberPage, "/identity/grant-requests", {
    hid,
    appId: "recipes",
    requestedLevel: "edit",
  });
  expect(
    (await bff(ownerPage, `/identity/grant-requests/${request.body.id}/approve`, {})).status,
  ).toBe(200);

  await memberPage.goto(`/h/${hid}/a/recipes`);
  await expect(memberPage.getByRole("heading", { name: "Рецепты" })).toBeVisible();

  expect(
    (await bff(ownerPage, "/identity/account/security/reauth", { password: PASSWORD })).status,
  ).toBe(200);
  const removed = await bff(ownerPage, "/identity/api/auth/organization/remove-member", {
    organizationId: hid,
    memberIdOrEmail: accept.body.member.id,
  });
  expect(removed.status).toBe(200);

  // identity-service → access.changed webhook → BFF → SSE → this tab.
  await expect(memberPage.getByText("Нет доступа к этому пространству")).toBeVisible({
    timeout: 10_000,
  });
  await expect(memberPage.getByRole("heading", { name: "Рецепты" })).toHaveCount(0);
  // Same address (the host canonicalizes it with the household's slug).
  expect(new URL(memberPage.url()).pathname).toMatch(new RegExp(`^/h/${hid}(-[^/]+)?/a/recipes$`));
});
