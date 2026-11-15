import { isNullOrUndefined } from "@/utils";

class QueryRoutersUtils {


/**
 * Extracts query parameters from a route object and returns them as a
 * key-value pair object.
 *
 * @param route - The route object containing query parameters.
 * @returns An object containing the query parameters as key-value pairs.
 */
    static setQuerys(route: any) {

        if (isNullOrUndefined(route.query)){
            return null
        }

        const props: Record<string, any> = {};
        for (const key in route.query) {
            if (route.query.hasOwnProperty(key)) {
            props[key] = route.query[key];
            }
        }
        return props;
      }
}

export default QueryRoutersUtils