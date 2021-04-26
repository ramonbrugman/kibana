/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SUB_CASE_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
} from '../../../common/constants';
import { CaseUserActionsResponseRt, CaseUserActionsResponse } from '../../../common/api';
import { createCaseError } from '../../common/error';
import { checkEnabledCaseConnectorOrThrow } from '../../common';
import { CasesClientArgs } from '..';

interface GetParams {
  caseId: string;
  subCaseId?: string;
}

export const get = async (
  { caseId, subCaseId }: GetParams,
  clientArgs: CasesClientArgs
): Promise<CaseUserActionsResponse> => {
  const { savedObjectsClient, userActionService, logger } = clientArgs;

  try {
    checkEnabledCaseConnectorOrThrow(subCaseId);

    const userActions = await userActionService.getAll({
      soClient: savedObjectsClient,
      caseId,
      subCaseId,
    });

    return CaseUserActionsResponseRt.encode(
      userActions.saved_objects.reduce<CaseUserActionsResponse>((acc, ua) => {
        if (subCaseId == null && ua.references.some((uar) => uar.type === SUB_CASE_SAVED_OBJECT)) {
          return acc;
        }
        return [
          ...acc,
          {
            ...ua.attributes,
            action_id: ua.id,
            case_id: ua.references.find((r) => r.type === CASE_SAVED_OBJECT)?.id ?? '',
            comment_id: ua.references.find((r) => r.type === CASE_COMMENT_SAVED_OBJECT)?.id ?? null,
            sub_case_id: ua.references.find((r) => r.type === SUB_CASE_SAVED_OBJECT)?.id ?? '',
          },
        ];
      }, [])
    );
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve user actions case id: ${caseId} sub case id: ${subCaseId}: ${error}`,
      error,
      logger,
    });
  }
};
