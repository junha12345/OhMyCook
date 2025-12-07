# **Google Image Search Implementation Plan**

## **Goal**

To retrieve highly relevant and specific images for LLM-generated recipes using the Google Custom Search API.

## **Strategy**

### **1. LLM-Driven Query Optimization**

Request the LLM (Gemini) to generate a specific `imageSearchQuery` field in the recipe JSON response, optimized for Google Image Search.

- **Objective**: Create a concise, keyword-focused query (2-4 words) that captures the visual essence of the dish.
- **Format**: Core Ingredient + Dish Type (e.g., "Kimchi Fried Rice", "Garlic Butter Steak").
- **Schema Description**: 
    > "A concise, optimal search query for finding a relevant image. Focus on main ingredients and dish type. Avoid subjective adjectives (e.g., 'zesty', 'delicious') and abstract terms."

### **2. Google Custom Search JSON API**

Use the Google Custom Search JSON API to fetch the first image result for the generated query.

- **API Endpoint**: `https://www.googleapis.com/customsearch/v1`
- **Parameters**:
    - `q`: `imageSearchQuery` from LLM.
    - `searchType`: `image`
    - `num`: `1` (Fetch only the top result).
    - `safe`: `off` (Adjustable based on preference).
    - `cx`: Search Engine ID (Pre-configured in Google Cloud Console).
    - `key`: API Key.

## **Implementation Steps**

### **Step 1: Environment Configuration**
Add the necessary credentials to the `.env` file:
- `GOOGLE_SEARCH_API_KEY`: API Key from Google Cloud Console.
- `GOOGLE_SEARCH_CX`: Programmable Search Engine ID.

### **Step 2: Backend / LLM Prompt Update**
- Modify the `recipeOverviewSchema` in `api/gemini.ts` (or equivalent) to include the `imageSearchQuery` field.
- Ensure the field description provides clear instructions to the LLM to generate objective, noun-focused keywords.

### **Step 3: Service Layer**
- Create a utility function (e.g., `fetchRecipeImage(query: string)`) to handle the API request.
- Parse the JSON response and extract the `link` from the first item in the `items` array.
- Handle potential errors (quota exceeded, network issues) gracefully.

### **Step 4: Frontend Integration**
- Use the returned image URL in the recipe display component.
- **IMPORTANT**: Implement a `ImageWithFallback` component to handle broken links or quota errors by showing a default placeholder or category-based icon.

## **API Limits & Cost Management**
- **Free Tier**: 100 queries per day.
- **Paid Tier**: $5 per 1,000 queries.
- **Optimization**:
    - Consider implementing caching (local or server-side) for frequently requested recipes to reduce API usage.