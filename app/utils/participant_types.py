PHARMACY_TYPES = {"farmacist", "farmacy_owner", "farmacy_head_supervisor", "farmacy_head", "farmacy_supervisor", "farmacy_sales_staff"}
HETERO_TYPES = {"medical_rep", "hetero_rep", "hetero_representative_staff", "hetero_staff", "hetero_representative", "representative", "rep", "mr"}


def is_hetero_type(participant_type):
    return participant_type in HETERO_TYPES


def is_pharmacy_type(participant_type):
    return participant_type in PHARMACY_TYPES


def app_role_for_participant(participant):
    return "hetero_rep" if participant and is_hetero_type(participant.participant_type) else "participant"
