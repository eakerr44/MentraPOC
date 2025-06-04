const { ChromaClient } = require('chromadb');
require('dotenv').config();

// ChromaDB configuration
const config = {
  host: process.env.CHROMA_HOST || 'localhost',
  port: parseInt(process.env.CHROMA_PORT) || 8000,
  collectionName: process.env.CHROMA_COLLECTION_NAME || 'mentra_context',
  auth: process.env.CHROMA_AUTH_TOKEN || null
};

// Initialize ChromaDB client
let chromaClient = null;
let contextCollection = null;

const initializeChromaClient = async () => {
  try {
    const clientConfig = {
      path: `http://${config.host}:${config.port}`
    };
    
    if (config.auth) {
      clientConfig.auth = { token: config.auth };
    }

    chromaClient = new ChromaClient(clientConfig);
    
    console.log('✅ ChromaDB client initialized successfully');
    return chromaClient;
  } catch (error) {
    console.error('❌ Failed to initialize ChromaDB client:', error);
    throw error;
  }
};

// Test ChromaDB connection
const testChromaConnection = async () => {
  try {
    if (!chromaClient) {
      await initializeChromaClient();
    }
    
    // Test connection by getting version
    const version = await chromaClient.version();
    console.log(`✅ ChromaDB connection successful. Version: ${version}`);
    return true;
  } catch (error) {
    console.error('❌ ChromaDB connection failed:', error);
    throw error;
  }
};

// Initialize the main context collection
const initializeContextCollection = async () => {
  try {
    if (!chromaClient) {
      await initializeChromaClient();
    }

    // Create or get the collection for storing learning context
    contextCollection = await chromaClient.getOrCreateCollection({
      name: config.collectionName,
      metadata: {
        description: 'Student learning context and interaction history',
        version: '1.0.0',
        created_at: new Date().toISOString()
      }
    });

    console.log(`✅ Context collection '${config.collectionName}' ready`);
    return contextCollection;
  } catch (error) {
    console.error('❌ Failed to initialize context collection:', error);
    throw error;
  }
};

// Store learning context (embeddings + metadata)
const storeContext = async (data) => {
  try {
    if (!contextCollection) {
      await initializeContextCollection();
    }

    const {
      id,
      content,
      embedding,
      metadata = {}
    } = data;

    // Validate required fields
    if (!id || !content || !embedding) {
      throw new Error('Missing required fields: id, content, or embedding');
    }

    // Add timestamp and additional metadata
    const enrichedMetadata = {
      ...metadata,
      timestamp: new Date().toISOString(),
      content_type: metadata.content_type || 'learning_interaction',
      student_id: metadata.student_id || null,
      session_id: metadata.session_id || null
    };

    await contextCollection.add({
      ids: [id],
      documents: [content],
      embeddings: [embedding],
      metadatas: [enrichedMetadata]
    });

    console.log(`✅ Stored context with ID: ${id}`);
    return { id, stored: true };
  } catch (error) {
    console.error('❌ Failed to store context:', error);
    throw error;
  }
};

// Query similar contexts based on embedding
const queryContext = async (queryEmbedding, options = {}) => {
  try {
    if (!contextCollection) {
      await initializeContextCollection();
    }

    const {
      nResults = 5,
      where = {},
      include = ['documents', 'metadatas', 'distances']
    } = options;

    const results = await contextCollection.query({
      queryEmbeddings: [queryEmbedding],
      nResults,
      where,
      include
    });

    console.log(`✅ Found ${results.documents[0]?.length || 0} similar contexts`);
    return {
      documents: results.documents[0] || [],
      metadatas: results.metadatas[0] || [],
      distances: results.distances[0] || [],
      ids: results.ids[0] || []
    };
  } catch (error) {
    console.error('❌ Failed to query context:', error);
    throw error;
  }
};

// Get context by student ID
const getStudentContext = async (studentId, options = {}) => {
  try {
    if (!contextCollection) {
      await initializeContextCollection();
    }

    const {
      limit = 10,
      contentType = null,
      timeRange = null
    } = options;

    let whereClause = { student_id: studentId };
    
    if (contentType) {
      whereClause.content_type = contentType;
    }

    // Note: ChromaDB doesn't support complex time queries directly
    // We'll implement time filtering in application logic if needed
    
    const results = await contextCollection.get({
      where: whereClause,
      limit,
      include: ['documents', 'metadatas']
    });

    return {
      contexts: results.documents || [],
      metadata: results.metadatas || [],
      ids: results.ids || []
    };
  } catch (error) {
    console.error('❌ Failed to get student context:', error);
    throw error;
  }
};

// Delete context by ID
const deleteContext = async (id) => {
  try {
    if (!contextCollection) {
      await initializeContextCollection();
    }

    await contextCollection.delete({
      ids: [id]
    });

    console.log(`✅ Deleted context with ID: ${id}`);
    return { id, deleted: true };
  } catch (error) {
    console.error('❌ Failed to delete context:', error);
    throw error;
  }
};

// Get collection statistics
const getCollectionStats = async () => {
  try {
    if (!contextCollection) {
      await initializeContextCollection();
    }

    const count = await contextCollection.count();
    
    return {
      collection_name: config.collectionName,
      total_contexts: count,
      status: 'healthy'
    };
  } catch (error) {
    console.error('❌ Failed to get collection stats:', error);
    throw error;
  }
};

// Reset collection (for development/testing)
const resetCollection = async () => {
  try {
    if (!chromaClient) {
      await initializeChromaClient();
    }

    // Delete existing collection
    try {
      await chromaClient.deleteCollection({ name: config.collectionName });
      console.log(`🗑️  Deleted existing collection: ${config.collectionName}`);
    } catch (error) {
      // Collection might not exist, that's okay
      console.log(`ℹ️  Collection ${config.collectionName} doesn't exist or already deleted`);
    }

    // Recreate collection
    await initializeContextCollection();
    console.log(`✅ Collection ${config.collectionName} reset successfully`);
    
    return { reset: true };
  } catch (error) {
    console.error('❌ Failed to reset collection:', error);
    throw error;
  }
};

module.exports = {
  config,
  initializeChromaClient,
  testChromaConnection,
  initializeContextCollection,
  storeContext,
  queryContext,
  getStudentContext,
  deleteContext,
  getCollectionStats,
  resetCollection,
  // Expose clients for advanced usage
  getClient: () => chromaClient,
  getCollection: () => contextCollection
}; 