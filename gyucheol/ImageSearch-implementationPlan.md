# **Unsplash Query Strategy**

## **Goal**

To retrieve relevant images from the Unsplash API for LLM-generated recipes.

## **Research Findings**

Testing with recipe "Zesty Lime Chicken and Asparagus Stir-fry":

- **Query "Zesty Lime Chicken and Asparagus Stir-fry"**: Resulted in generic asparagus images, poor relevance.
- **Query "Chicken Asparagus Stir-fry"**: Resulted in highly relevant images.

**Conclusion**: Specific adjectives (Zesty, Lime) and long phrases dilute the search relevance. Focusing on core ingredients and cooking method is best.

## **Proposed Strategy**

### **1. LLM-Driven Query (Best)**

Request the LLM to generate a specific `imageSearchQuery` field in the JSON response.

- **Pros**: The LLM understands the "essence" of the dish better than any regex.
- **Example**:
    
    ```
    {
      "recipeName": "Zesty Lime Chicken and Asparagus Stir-fry",
      "imageSearchQuery": "chicken asparagus stir fry"
    }
    
    ```
    

### **2. Fallback Logic (Heuristic)**

If the `imageSearchQuery` is missing, use a cleaner function:

1. **Stop Words**: Remove common subjective adjectives (Zesty, Delicious, Homemade, Easy).
2. **Length Cap**: If the name is too long (> 4 words), try to extract capitalized nouns or fallback to `cuisine` + "dish".
3. **English Name**: Always use `englishRecipeName` if available.

## **Proposed Changes**

(Code not to be implemented yet, just planned)

### **Backend / LLM Prompt**

- Update the prompt in `pages/api/generate-recipe.ts` (or equivalent) to include `imageSearchQuery` in the output schema.

### **Frontend**

- Create a helper `getUnsplashQuery(recipe: Recipe): string`.
- Use this helper when calling the Unsplash API.