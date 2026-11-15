import { useToast } from "vue-toastification";
import KanbanUndoToastContent from "../components/KanbanUndoToastContent.vue";

const UNDO_TOAST_TIMEOUT_MS = 8000;

export function useUndoToast() {
  const toast = useToast();

  function showUndoToast(entityName: string, destinationLabel: string, onUndo: () => void) {
    const toastId = toast.info(
      {
        component: KanbanUndoToastContent,
        props: { entityName, destinationLabel },
        listeners: {
          undo: () => {
            onUndo();
            toast.dismiss(toastId);
          }
        }
      },
      { timeout: UNDO_TOAST_TIMEOUT_MS, closeOnClick: false }
    );
    return toastId;
  }

  return { showUndoToast };
}
