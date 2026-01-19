import {
  HTTPError,
  isDevMode,
  NAMNsxSecurityGroup,
  NAMNsxSecurityGroupIP,
  NAMv2Driver,
  NetboxCustomField,
  NetboxCustomFieldChoiceSet,
  NetboxDriver,
  NetboxPrefix,
} from "@norskhelsenett/zeniki";
import logger from "./loggers/logger.ts";

export const processConsumerGroups = async (
  nam: NAMv2Driver,
  ipam: NetboxDriver,
) => {
  try {
    // Fetch domains from NetBox IPAM
    logger.debug(
      `ipam-nam-nsg-ssi: Processing consumer groups...`,
    );
    const domains: string[] = await getNetboxDomains(ipam);

    // Fetch existing NSX Security Groups from NAM
    const namSecurityGroups = await nam.nsx_security_groups
      .getNsxSecurityGroups();

    for (const domain of domains) {
      try {
        if (isDevMode()) {
          logger.debug(
            `ipam-nam-nsg-ssi: Processing domain: ${domain}...`,
            {
              component: "worker",
              method: "work",
            },
          );

          // Fetch prefixes from NetBox for the current domain
          const netboxDomainPrefixes = (
            await ipam.prefixes.getPrefixes(
              {
                cf_domain: domain,
              },
              true,
            )
          ).results as NetboxPrefix[];

          // Filter prefixes based on VRF and status
          // ? This can't be done directly in getPrefixes because of NetBox limitations for cf_ queries
          const netboxPrefixes = netboxDomainPrefixes.filter(
            (prefix: NetboxPrefix) =>
              prefix.vrf &&
              typeof prefix.vrf === "object" &&
              prefix.vrf.name === "nhc" &&
              typeof prefix.status === "object" &&
              prefix.status.value !== "container",
          );

          logger.debug(
            `ipam-nam-nsg-ssi: Retrieved ${netboxPrefixes.length} prefixes for domain ${domain} from IPAM ${ipam.getHostname()}`,
            {
              component: "worker",
              method: "work",
            },
          );

          // Check if NSX Security Group exists in NAM for the domain
          const securityGroup = namSecurityGroups.results.find(
            (sg) => sg.name === `nsg-consumer-${domain}`,
          );

          // If the security group does not exist, create it
          if (!securityGroup) {
            const securityGroup: NAMNsxSecurityGroup = {
              name: `nsg-consumer-${domain}`,
              desc: "Managed by NAM",
              scope: "consumer",
              tag: domain,
              ipAddresses: netboxPrefixes.map(
                (netboxPrefix: NetboxPrefix) => {
                  return {
                    ip: netboxPrefix.prefix,
                  } as NAMNsxSecurityGroupIP;
                },
              ),
            };

            const meta = {
              name: securityGroup.name,
              type: "CREATE",
              src: {
                system: "IPAM",
                servers: ipam.getHostname(),
              },
              dst: {
                system: "NAM",
                server: nam.getHostname(),
              },
              changes: {
                added: netboxPrefixes.map(
                  (netboxPrefix: NetboxPrefix) => netboxPrefix.prefix,
                ),
                removed: [],
              },
            };

            await nam.nsx_security_groups
              .addNsxSecurityGroup(securityGroup)
              .catch((error) => {
                logger.error(
                  `Error creating NSX Security Group for domain ${domain}:`,
                  error,
                );
              })
              .then(
                () => {
                  logger.info(
                    `ipam-nam-nsg-ssi: Created NSX Security Group '${securityGroup.name}' from '${ipam.getHostname()}' on '${nam.getHostname()}'.`,
                    meta,
                  );
                },
              )
              .catch((error) => {
                logger.error(
                  `Error creating NSX Security Group for domain ${domain}:`,
                  error,
                );
                throw error;
              });
          } else {
            // If it exists, update if needed
            const namPrefixes = securityGroup.ipAddresses;

            logger.debug(
              `ipam-nam-nsg-ssi: Retrieved ${namPrefixes.length} prefixes for NSX Security Group '${securityGroup.name}' from NAM ${nam.getHostname()}`,
              {
                component: "worker",
                method: "work",
              },
            );

            const addedPrefixes = netboxPrefixes
              .filter((netboxPrefix: NetboxPrefix) => {
                return !namPrefixes.find(
                  (namPrefixes: NAMNsxSecurityGroupIP) =>
                    namPrefixes.ip === netboxPrefix.prefix,
                );
              })
              .map((p) => {
                return { ip: p.prefix };
              });

            const removedPrefixes = namPrefixes.filter(
              (namPrefix: NAMNsxSecurityGroupIP) => {
                return !netboxPrefixes.find(
                  (netboxPrefix: NetboxPrefix) =>
                    netboxPrefix.prefix === namPrefix.ip,
                );
              },
            );

            // console.log(" - Prefixes to be added:", addedPrefixes);
            // console.log(" - Prefixes to be removed:", removedPrefixes);

            // Update the security group if there are changes
            if (addedPrefixes.length > 0 || removedPrefixes.length > 0) {
              const meta = {
                name: securityGroup.name,
                type: "UPDATE",
                src: {
                  system: "IPAM",
                  servers: ipam.getHostname(),
                },
                dst: {
                  system: "NAM",
                  server: nam.getHostname(),
                },
                changes: {
                  added: addedPrefixes.map((p) => p.ip),
                  removed: removedPrefixes.map((p) => p.ip),
                },
              };

              await nam.nsx_security_groups
                .patchNsxSecurityGroup(securityGroup._id as string, {
                  _id: securityGroup._id,
                  desc: "Managed by NAM",
                  ipAddresses: netboxPrefixes.map(
                    (netboxPrefix: NetboxPrefix) => {
                      return {
                        ip: netboxPrefix.prefix,
                      } as NAMNsxSecurityGroupIP;
                    },
                  ),
                } as Partial<NAMNsxSecurityGroup>)
                .then(
                  () => {
                    logger.info(
                      `ipam-nam-nsg-ssi: Updated NSX Security Group '${securityGroup.name}' from '${ipam.getHostname()}' on '${nam.getHostname()}'.`,
                      meta,
                    );
                  },
                )
                .catch((error) => {
                  logger.error(
                    `Error updating NSX Security Group for domain ${domain}:`,
                    error,
                  );
                  throw error;
                });
              logger.info(
                `Updated NSX Security Group for domain ${domain} with ${addedPrefixes.length} added prefixes and ${removedPrefixes.length} removed prefixes.`,
              );
            }
          }
        }
      } catch (error: unknown) {
        logger.error(
          `ipam-nam-nsg-ssi: Failed to process domain ${domain}, skipping to next domain`,
          {
            component: "worker",
            method: "work",
            error: (error as HTTPError).message ?? String(error),
          },
        );
        // Continue to next domain
        continue;
      }
    }

    // Final cleanup - clear domains array
    if (isDevMode()) {
      logger.debug(
        `ipam-nam-nsg-ssi: Cleaning up integrators array (${domains.length} integrators processed)`,
        {
          component: "worker",
          method: "work",
        },
      );
    }
    domains.length = 0;
  } catch (error) {
    throw error;
  }
};

export const processEnvironmentGroups = async (
  nam: NAMv2Driver,
  ipam: NetboxDriver,
) => {
  try {
    // Fetch domains from NetBox IPAM
    logger.debug(
      `ipam-nam-nsg-ssi: Processing consumer groups...`,
    );
    const environments: string[] = await getNetboxEnvironments(ipam);

    // Fetch existing NSX Security Groups from NAM
    const namSecurityGroups = await nam.nsx_security_groups
      .getNsxSecurityGroups();

    for (const environment of environments) {
      try {
        if (isDevMode()) {
          logger.debug(
            `ipam-nam-nsg-ssi: Processing environment: ${environment}...`,
            {
              component: "worker",
              method: "work",
            },
          );

          // Fetch prefixes from NetBox for the current environment
          const netboxEnvironmentPrefixes = (
            await ipam.prefixes.getPrefixes(
              {
                cf_env: environment,
              },
              true,
            )
          ).results as NetboxPrefix[];

          // Filter prefixes based on VRF and status
          // ? This can't be done directly in getPrefixes because of NetBox limitations for cf_ queries
          const netboxPrefixes = netboxEnvironmentPrefixes.filter(
            (prefix: NetboxPrefix) =>
              prefix.vrf &&
              typeof prefix.vrf === "object" &&
              prefix.vrf.name === "nhc" &&
              typeof prefix.status === "object" &&
              prefix.status.value !== "container",
          );

          // Check if NSX Security Group exists in NAM for the domain
          const securityGroup = namSecurityGroups.results.find(
            (sg) => sg.name === `nsg-environment-${environment}`,
          );

          // If the security group does not exist, create it
          if (!securityGroup) {
            const securityGroup: NAMNsxSecurityGroup = {
              name: `nsg-environment-${environment}`,
              desc: "Managed by NAM",
              scope: "environment",
              tag: environment,
              ipAddresses: netboxPrefixes.map(
                (netboxPrefix: NetboxPrefix) => {
                  return {
                    ip: netboxPrefix.prefix,
                  } as NAMNsxSecurityGroupIP;
                },
              ),
            };

            const meta = {
              name: securityGroup.name,
              type: "CREATE",
              src: {
                system: "IPAM",
                servers: ipam.getHostname(),
              },
              dst: {
                system: "NAM",
                server: nam.getHostname(),
              },
              changes: {
                added: netboxPrefixes.map(
                  (netboxPrefix: NetboxPrefix) => netboxPrefix.prefix,
                ),
                removed: [],
              },
            };

            await nam.nsx_security_groups
              .addNsxSecurityGroup(securityGroup)
              .catch((error) => {
                logger.error(
                  `Error creating NSX Security Group for environment ${environment}:`,
                  error,
                );
              })
              .then(
                () => {
                  logger.info(
                    `ipam-nam-nsg-ssi: Created NSX Security Group '${securityGroup.name}' from '${ipam.getHostname()}' on '${nam.getHostname()}'.`,
                    meta,
                  );
                },
              )
              .catch((error) => {
                logger.error(
                  `Error creating NSX Security Group for environment ${environment}:`,
                  error,
                );
                throw error;
              });
          } else {
            // If it exists, update if needed
            const namPrefixes = securityGroup.ipAddresses;

            const addedPrefixes = netboxPrefixes
              .filter((netboxPrefix: NetboxPrefix) => {
                return !namPrefixes.find(
                  (namPrefixes: NAMNsxSecurityGroupIP) =>
                    namPrefixes.ip === netboxPrefix.prefix,
                );
              })
              .map((p) => {
                return { ip: p.prefix };
              });

            const removedPrefixes = namPrefixes.filter(
              (namPrefix: NAMNsxSecurityGroupIP) => {
                return !netboxPrefixes.find(
                  (netboxPrefix: NetboxPrefix) =>
                    netboxPrefix.prefix === namPrefix.ip,
                );
              },
            );

            // Update the security group if there are changes
            if (addedPrefixes.length > 0 || removedPrefixes.length > 0) {
              const meta = {
                name: securityGroup.name,
                type: "UPDATE",
                src: {
                  system: "IPAM",
                  servers: ipam.getHostname(),
                },
                dst: {
                  system: "NAM",
                  server: nam.getHostname(),
                },
                changes: {
                  added: addedPrefixes.map((p) => p.ip),
                  removed: removedPrefixes.map((p) => p.ip),
                },
              };

              await nam.nsx_security_groups
                .patchNsxSecurityGroup(securityGroup._id as string, {
                  _id: securityGroup._id,
                  desc: "Managed by NAM",
                  ipAddresses: netboxPrefixes.map(
                    (netboxPrefix: NetboxPrefix) => {
                      return {
                        ip: netboxPrefix.prefix,
                      } as NAMNsxSecurityGroupIP;
                    },
                  ),
                } as Partial<NAMNsxSecurityGroup>)
                .then(
                  () => {
                    logger.info(
                      `ipam-nam-nsg-ssi: Updated NSX Security Group '${securityGroup.name}' from '${ipam.getHostname()}' on '${nam.getHostname()}'.`,
                      meta,
                    );
                  },
                )
                .catch((error) => {
                  logger.error(
                    `Error updating NSX Security Group for environment ${environment}:`,
                    error,
                  );
                  throw error;
                });
            }
          }
        }
      } catch (error: unknown) {
        logger.error(
          `ipam-nam-nsg-ssi: Failed to process environment ${environment}, skipping to next environment`,
          {
            component: "worker",
            method: "work",
            error: (error as HTTPError).message ?? String(error),
          },
        );
        // Continue to next environment
        continue;
      }
    }

    // Final cleanup - clear environments array
    if (isDevMode()) {
      logger.debug(
        `ipam-nam-nsg-ssi: Cleaning up environments array (${environments.length} environments processed)`,
        {
          component: "worker",
          method: "work",
        },
      );
    }
    environments.length = 0;
  } catch (error) {
    throw error;
  }
};

const getNetboxDomains = async (
  ipam: NetboxDriver,
): Promise<string[]> => {
  // Retrieve custom fields from NetBox IPAM
  const customFields = await ipam.custom_fields.getCustomFields().catch(
    (error: HTTPError) => {
      logger.error(
        `ipam-nam-nsg-ssi: Could not retrieve custom fields from IPAM ${ipam.getHostname()} due to ${error.message}`,
        {
          component: "ssi.utils",
          method: "getNetboxDomains",
          error: isDevMode() ? error : error.message,
        },
      );
      throw error;
    },
  );

  // Find the custom field with the name "domain"
  const domainCustomField = customFields.results.find(
    (cf) => cf.name === "domain",
  ) as NetboxCustomField;

  const choiceSet = domainCustomField.choice_set as NetboxCustomFieldChoiceSet;

  const domainsChoiceSet = await ipam.custom_fields.getCustomFieldChoiceSet(
    choiceSet!.id as number,
  ).catch(
    (error: HTTPError) => {
      logger.error(
        `ipam-nam-nsg-ssi: Could not retrieve custom field choice set from IPAM ${ipam.getHostname()} due to ${error.message}`,
        {
          component: "ssi.utils",
          method: "getNetboxDomains",
          error: isDevMode() ? error : error.message,
        },
      );
      throw error;
    },
  );

  const domains = domainsChoiceSet.extra_choices
    .filter((choice: string[]) => choice[0] !== "na")
    .map((choice: string[]) => choice[0]);

  return domains;
};

const getNetboxEnvironments = async (
  ipam: NetboxDriver,
): Promise<string[]> => {
  // Retrieve custom fields from NetBox IPAM
  const customFields = await ipam.custom_fields.getCustomFields().catch(
    (error: HTTPError) => {
      logger.error(
        `ipam-nam-nsg-ssi: Could not retrieve custom fields from IPAM ${ipam.getHostname()} due to ${error.message}`,
        {
          component: "ssi.utils",
          method: "getNetboxEnvironments",
          error: isDevMode() ? error : error.message,
        },
      );
      throw error;
    },
  );

  // Find the custom field with the name "domain"
  const domainCustomField = customFields.results.find(
    (cf) => cf.name === "env",
  ) as NetboxCustomField;

  const choiceSet = domainCustomField.choice_set as NetboxCustomFieldChoiceSet;

  const domainsChoiceSet = await ipam.custom_fields.getCustomFieldChoiceSet(
    choiceSet!.id as number,
  ).catch(
    (error: HTTPError) => {
      logger.error(
        `ipam-nam-nsg-ssi: Could not retrieve custom field choice set from IPAM ${ipam.getHostname()} due to ${error.message}`,
        {
          component: "ssi.utils",
          method: "getNetboxEnvironments",
          error: isDevMode() ? error : error.message,
        },
      );
      throw error;
    },
  );

  const environments = domainsChoiceSet.extra_choices
    .filter((choice: string[]) => choice[0] !== "na")
    .map((choice: string[]) => choice[0]);

  return environments;
};
