import {
  namespace,
  type ContributionToken,
  type TokenNamespace,
} from "@sagifire/ioc";

const INTERNAL_SCOPE_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

export type SynchronousContribution<TValue> =
  TValue extends PromiseLike<unknown> ? never : TValue;

export function createExtensiaInternalNamespace(scope: string): TokenNamespace {
  if (!INTERNAL_SCOPE_PATTERN.test(scope)) {
    throw new TypeError(
      "Extensia internal token scope must use lowercase namespaced segments",
    );
  }

  return namespace(`extensia.internal.${scope}`);
}

export function synchronousContribution<TValue>(
  value: SynchronousContribution<TValue>,
): SynchronousContribution<TValue> {
  return value;
}

export function synchronousContributionToken<TValue>(
  tokenNamespace: TokenNamespace,
  id: string,
  ..._guard: TValue extends PromiseLike<unknown> ? [never] : []
): ContributionToken<SynchronousContribution<TValue>> {
  void _guard;
  return tokenNamespace.contributionToken<SynchronousContribution<TValue>>(id);
}
