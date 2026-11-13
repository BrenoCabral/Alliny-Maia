import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import { findProfileById, getSessionClaims } from "./repository";

const USER_ID = "00000000-0000-4000-a000-000000000002";

function clientWithClaims(result: unknown) {
  const getClaims = vi.fn().mockResolvedValue(result);
  const client = { auth: { getClaims } } as unknown as SupabaseClient<Database>;
  return { client, getClaims };
}

function clientWithProfile(result: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const client = { from } as unknown as SupabaseClient<Database>;
  return { client, from, select, eq, maybeSingle };
}

describe("getSessionClaims", () => {
  it("devolve id e e-mail quando o token é válido", async () => {
    const { client, getClaims } = clientWithClaims({
      data: { claims: { sub: USER_ID, email: "cliente1@allinymaia.test" } },
      error: null,
    });
    await expect(getSessionClaims(client)).resolves.toEqual({
      userId: USER_ID,
      email: "cliente1@allinymaia.test",
    });
    expect(getClaims).toHaveBeenCalledTimes(1);
  });

  it("devolve e-mail nulo quando a claim email não existe", async () => {
    const { client } = clientWithClaims({
      data: { claims: { sub: USER_ID } },
      error: null,
    });
    await expect(getSessionClaims(client)).resolves.toEqual({
      userId: USER_ID,
      email: null,
    });
  });

  it("devolve null quando o Auth responde erro", async () => {
    const { client } = clientWithClaims({
      data: null,
      error: new Error("token inválido"),
    });
    await expect(getSessionClaims(client)).resolves.toBeNull();
  });

  it("devolve null quando não há sessão", async () => {
    const { client } = clientWithClaims({ data: null, error: null });
    await expect(getSessionClaims(client)).resolves.toBeNull();
  });
});

describe("findProfileById", () => {
  it("devolve a linha do perfil", async () => {
    const row = {
      id: USER_ID,
      role: "client",
      full_name: "Cliente Um de Teste",
    };
    const { client, from, select, eq } = clientWithProfile({
      data: row,
      error: null,
    });
    await expect(findProfileById(client, USER_ID)).resolves.toEqual(row);
    expect(from).toHaveBeenCalledWith("profiles");
    expect(select).toHaveBeenCalledWith("id, role, full_name");
    expect(eq).toHaveBeenCalledWith("id", USER_ID);
  });

  it("devolve null quando não existe linha", async () => {
    const { client } = clientWithProfile({ data: null, error: null });
    await expect(findProfileById(client, USER_ID)).resolves.toBeNull();
  });

  it("lança o erro do Supabase", async () => {
    const failure = new Error("permission denied for table profiles");
    const { client } = clientWithProfile({ data: null, error: failure });
    await expect(findProfileById(client, USER_ID)).rejects.toBe(failure);
  });
});
