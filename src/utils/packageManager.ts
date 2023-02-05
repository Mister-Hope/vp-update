import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execaCommandSync } from "execa";

export type PackageManager = "npm" | "yarn" | "pnpm";

const globalCache = new Map<string, boolean>();
const localCache = new Map<string, PackageManager>();

const NPM_LOCK = "package-lock.json";
const YARN_LOCK = "yarn.lock";
const PNPM_LOCK = "pnpm-lock.yaml";

const isInstalled = (packageManager: PackageManager): boolean => {
  try {
    return execaCommandSync(`${packageManager} --version`).exitCode === 0;
  } catch (e) {
    return false;
  }
};

/**
 * Check if a global package manager is available
 */
export const hasGlobalInstallation = (
  packageManager: PackageManager
): boolean => {
  const key = `global:${packageManager}`;

  const status = globalCache.get(key);

  if (status !== undefined) return status;

  if (isInstalled(packageManager)) {
    globalCache.set(key, true);

    return true;
  }

  return false;
};

export const getTypeofLockFile = (
  cwd = process.cwd(),
  deep = true
): PackageManager | null => {
  const key = `local:${cwd}`;

  const status = localCache.get(key);

  if (status !== undefined) return status;

  if (existsSync(resolve(cwd, PNPM_LOCK))) {
    localCache.set(key, "pnpm");

    return "pnpm";
  }

  if (existsSync(resolve(cwd, YARN_LOCK))) {
    localCache.set(key, "yarn");

    return "yarn";
  }

  if (existsSync(resolve(cwd, NPM_LOCK))) {
    localCache.set(key, "npm");

    return "npm";
  }

  if (deep) {
    let dir = cwd;

    while (dir !== dirname(dir)) {
      dir = dirname(dir);

      if (existsSync(resolve(dir, PNPM_LOCK))) {
        localCache.set(key, "pnpm");

        return "pnpm";
      }

      if (existsSync(resolve(dir, YARN_LOCK))) {
        localCache.set(key, "yarn");

        return "yarn";
      }

      if (existsSync(resolve(dir, NPM_LOCK))) {
        localCache.set(key, "npm");

        return "npm";
      }
    }
  }

  return null;
};

export const detectPackageManager = (
  cwd = process.cwd(),
  deep = false
): PackageManager => {
  const type = getTypeofLockFile(cwd, deep);

  return (
    type ||
    (hasGlobalInstallation("pnpm")
      ? "pnpm"
      : hasGlobalInstallation("yarn")
      ? "yarn"
      : "npm")
  );
};

export const getRegistry = (): string =>
  execaCommandSync(`${detectPackageManager()} config get registry`).stdout;
