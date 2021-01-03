export let tc = <T>(option: { try: () => T; catch: (e: Error) => T }) => {
  try {
    return option.try()
  } catch (e) {
    return option.catch(e)
  }
}
