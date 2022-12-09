import type { Blockchain } from "@coral-xyz/common";
import { Chain } from "@coral-xyz/zeus";

import { HASURA_URL, JWT } from "../config";

const chain = Chain(HASURA_URL, {
  headers: {
    Authorization: `Bearer ${JWT}`,
  },
});

export const getUsers = async (
  userIds: string[]
): Promise<{ username: unknown; id: unknown }[]> => {
  const response = await chain("query")({
    auth_users: [
      {
        where: { id: { _in: userIds } },
      },
      {
        id: true,
        username: true,
      },
    ],
  });
  return response.auth_users;
};

/**
 * Get a user by their username.
 */
export const getUserByUsername = async (username: string) => {
  const response = await chain("query")({
    auth_users: [
      {
        where: { username: { _eq: username } },
      },
      {
        id: true,
        username: true,
        public_keys: [{}, { blockchain: true, public_key: true }],
      },
    ],
  });
  if (!response.auth_users[0]) {
    throw new Error("user not found");
  }
  return transformUser(response.auth_users[0]);
};

/**
 * Get a user by their id.
 */
export const getUser = async (id: string) => {
  const response = await chain("query")({
    auth_users_by_pk: [
      {
        id,
      },
      {
        id: true,
        username: true,
        public_keys: [{}, { blockchain: true, public_key: true }],
      },
    ],
  });
  if (!response.auth_users_by_pk) {
    throw new Error("user not found");
  }
  return transformUser(response.auth_users_by_pk);
};

/**
 * Utility method to format a user for responses from a raw user object.
 */
const transformUser = (user: {
  id: unknown;
  username: unknown;
  public_keys: Array<{ blockchain: string; public_key: string }>;
  avatar_nft: string | null;
}) => {
  return {
    id: user.id,
    username: user.username,
    // Camelcase public keys for response
    publicKeys: user.public_keys.map((k) => ({
      blockchain: k.blockchain as Blockchain,
      publicKey: k.public_key,
    })),
    image:
      getAvatar(user.avatar_nft) ??
      `https://avatars.xnfts.dev/v1/${user.username}`,
  };
};
const defaultAvatar = `https://avatars.xnfts.dev/v1/${user.username}`;
const getAvatar = (avatar_nft: string | null): string => {
  if (!avatar_nft) {
    return defaultImage;
  }
};

/**
 * Create a user
 */
export const createUser = async (
  username: string,
  blockchainPublicKeys: Array<{ blockchain: Blockchain; publicKey: string }>,
  inviteCode?: string,
  waitlistId?: string | null
) => {
  const response = await chain("mutation")({
    insert_auth_users_one: [
      {
        object: {
          username: username,
          public_keys: {
            data: blockchainPublicKeys.map((b) => ({
              blockchain: b.blockchain,
              public_key: b.publicKey,
            })),
          },
          invitation_id: inviteCode,
          waitlist_id: waitlistId,
        },
      },
      {
        id: true,
        username: true,
      },
    ],
  });

  return response.insert_auth_users_one;
};

/**
 * Search for users by prefix.
 */
export async function getUsersByPrefix({
  usernamePrefix,
  uuid,
}: {
  usernamePrefix: string;
  uuid: string;
}) {
  const response = await chain("query")({
    auth_users: [
      {
        where: {
          username: { _like: `${usernamePrefix}%` },
          id: { _neq: uuid },
        },
      },
      {
        id: true,
        username: true,
      },
    ],
  });

  return response.auth_users || [];
}

/**
 * Delete a public key/blockchain from a user.
 */

export async function deleteUserPublicKey({
  userId,
  blockchain,
  publicKey,
}: {
  userId: string;
  blockchain: Blockchain;
  publicKey: string;
}) {
  const response = await chain("mutation")({
    delete_auth_public_keys: [
      {
        where: {
          user_id: { _eq: userId },
          blockchain: { _eq: blockchain },
          public_key: { _eq: publicKey },
        },
      },
      {
        affected_rows: true,
      },
    ],
  });

  return response.delete_auth_public_keys;
}

/**
 * Add a public key/blockchain to a user.
 */
export async function createUserPublicKey({
  userId,
  blockchain,
  publicKey,
}: {
  userId: string;
  blockchain: Blockchain;
  publicKey: string;
}) {
  const response = await chain("mutation")({
    insert_auth_public_keys_one: [
      {
        object: {
          user_id: userId,
          blockchain: blockchain as string,
          public_key: publicKey,
        },
      },
      {
        id: true,
      },
    ],
  });

  return response.insert_auth_public_keys_one;
}

/**
 * Update avatar_nft of a user.
 */

// update_auth_users(where: {id: {_eq: ":id"}}, _set: {avatar_nft: null})
export async function updateUserAvatar({
  userId,
  avatar,
}: {
  userId: string;
  avatar: string;
}) {
  const response = await chain("mutation")({
    update_auth_users: [
      {
        where: {
          id: { _eq: userId },
        },
        _set: {
          avatar_nft: avatar === "null" ? null : avatar,
        },
      },
      {
        affected_rows: true,
      },
    ],
  });

  return response.update_auth_users;
}
