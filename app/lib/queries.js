export const getProductsQuery = `
query productInfo {
  products(first: 10) {
    edges {
      node {
        title
        handle
        status
        createdAt
        variants(first: 3) {
          edges {
            node {
              price
              barcode
              createdAt
            }
          }
        }
      }
    }
  }
}`;

export const getAllProductsQuery = `  
query productInfo {
  products(first: 100) {
    edges {
      node {
        id
        title
        handle
        status
        createdAt
        variants(first: 10) {
          edges {
            node {
              id
              displayName
              price
              compareAtPrice
              createdAt
            }
          }
        }
      }
    }
  }
}
`;

export const addProductsQuery = `
mutation createProduct($input: ProductInput!) {
  productCreate(input: $input) {
    product {
      id
      title
      handle
      status
      createdAt
      variants(first:1){
        edges{
          node{
            id
          }
        }
      }
    } 
    userErrors {
      field
      message
    }
  }
}
`;

export const addProductVariantsQuery = `
mutation shopifyRemixTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants {
      price
      barcode
      createdAt
    }
    userErrors {
      field
      message
    }
  }
}`;

export const updateProductVariantsPrice = `
mutation updateProductVariantsPrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants {
      id
      price
      compareAtPrice
    }
    userErrors {
      field
      message
    }
  }
}`;

export const singleProductVariantId = `
query getProductVariants($id: ID!) {
  product(id: $id) {
    variants(first: 5) {
      edges {
        node {
          id
          price
          compareAtPrice
          createdAt
        }
      }
    }
  }
}
`;

// , sortKey: CREATED_AT, reverse: true
