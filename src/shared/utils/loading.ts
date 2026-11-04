/** Show a blocking indicator for the duration of an eUICC operation. */
export const makeLoading = (
  setLoading: (v: boolean) => void,
  exec: () => Promise<void>,
) => {
  setLoading(true);
  setTimeout(() => {
    void (async () => {
      try {
        await exec();
      } catch (error) {
        // eUICC commands may apply successfully before a follow-up read throws.
        // Never leave the global UI blocked on an unhandled rejection.
        console.warn('eUICC operation failed or status refresh failed', error);
      } finally {
        setLoading(false);
      }
    })();
  }, 100);
};
