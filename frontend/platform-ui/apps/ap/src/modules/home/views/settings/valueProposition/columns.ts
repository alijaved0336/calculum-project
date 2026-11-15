import * as globalColumns from '@ada/design-system/data/globalColumns'

export const defaultColumns = [

    ...globalColumns.nameofValueProposition,
    ...globalColumns.currencyCodeValueProposition,
    ...globalColumns.ValuePropositionExpireDate,
    ...globalColumns.isPublic,
    ...globalColumns.statusofValueProposition,
    ...globalColumns.shareValueProposition,
    ...globalColumns.createdInvitation,
    ...globalColumns.createdByInvitationsbyEmail,
    ...globalColumns.updatedDateBy,
    ...globalColumns.updatedBy,
    ...globalColumns.actionsValueProposition
]

export const invitationColumns = [
    ...globalColumns.invitationIdbyValueProposition,
    ...globalColumns.createdByInvitationsbyEmail,
    ...globalColumns.createdInvitation,
    ...globalColumns.statusofValueProposition,
    ...globalColumns.actionsInvitationsValueProposition
]