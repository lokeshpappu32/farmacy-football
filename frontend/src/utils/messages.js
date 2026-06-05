const messageKeys = new Map([
  ["Please accept the terms and conditions.", "errors.acceptTerms"],
  ["Please select a country from the list.", "errors.countryRequired"],
  ["Enter user ID and password.", "errors.adminCredentialsRequired"],
  ["Enter valid user ID and password.", "errors.invalidAdminLogin"],
  ["Enter valid login details.", "errors.invalidLoginDetails"],
  ["No enrollment found for this mobile number.", "errors.noEnrollment"],
  ["Kindly ask your Hetero Representative to enroll first using his/her mobile number.", "errors.mrRequired"],
  ["Entered Hetero Medical Rep mobile number already exists.", "errors.duplicateHeteroMobile"],
  ["Entered Farmacist mobile number already exists.", "errors.duplicateFarmacistMobile"],
  ["Entered mobile number already exists for enrollment.", "errors.duplicateMobile"],
  ["Select a winning team.", "errors.selectWinningTeam"],
  ["Select the new match date and time.", "errors.selectMatchDate"],
  ["Prediction saved. You can edit until kickoff.", "toast.predictionSaved"],
  ["Match created.", "toast.matchCreated"],
  ["Match updated.", "toast.matchUpdated"],
]);

export function localizeMessage(message, t) {
  const key = messageKeys.get(String(message || "").trim());
  return key ? t(key, message) : message;
}
