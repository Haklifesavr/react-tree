import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { IgrTree, IgrTreeItem, IgrTreeModule } from 'igniteui-react';
import 'igniteui-webcomponents/themes/light/bootstrap.css';
import { FaEdit, FaSearch } from 'react-icons/fa';

IgrTreeModule.register();

interface Category {
    id: number;
    name: string;
    description: string;
    parent: number | null; // Added parent field to track parent category ID
    subcategories: Category[];
}

interface TreeBasicExampleState {
    categories: Category[];
    draggedItemId: number | null;
    isModalOpen: boolean;
    currentCategory: Category | null;
    updatedName: string;
    updatedDescription: string;
    expandedItems: { [key: number]: boolean }; // Track expanded state for categories
    searchTerm: string; // Track search term
    searchResults: number[]; // Track matching categories' IDs
}

class TreeBasicExample extends React.Component<any, TreeBasicExampleState> {
    constructor(props: any) {
        super(props);
        this.state = {
            categories: [],
            draggedItemId: null,
            isModalOpen: false,
            currentCategory: null,
            updatedName: '',
            updatedDescription: '',
            expandedItems: {},
            searchTerm: '', // Initialize searchTerm
            searchResults: [] // Initialize searchResults
        };
    }

    componentDidMount() {
        this.fetchCategories();
    }

    // Fetch categories from the API
    fetchCategories = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/categories/');
            const data = await response.json();
            this.setState({ categories: data });
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    // Handle search input change
    handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ searchTerm: event.target.value });
    };

    expandAndHighlightParents = (
        categoryId: number | null, 
        expandedItems: { [key: number]: boolean }, 
        searchResults: number[]
      ): { expandedItems: { [key: number]: boolean }, searchResults: number[] } => {
        
        if (categoryId === null) return { expandedItems, searchResults };

        const category = this.findCategoryById(this.state.categories, categoryId);
        if (category) {
            expandedItems[category.id] = true;
            searchResults.push(category.id);

            if (category.parent !== null) {
                return this.expandAndHighlightParents(category.parent, expandedItems, searchResults);
            }
        }

        return { expandedItems, searchResults };
    };

    findCategoryById = (categories: Category[], id: number): Category | null => {
        for (const category of categories) {
            if (category.id === id) return category;
            if (category.subcategories) {
                const found = this.findCategoryById(category.subcategories, id);
                if (found) return found;
            }
        }
        return null;
    };

    handleSearch = () => {
        const { categories, searchTerm } = this.state;
        let expandedItems: { [key: number]: boolean } = {};
        let searchResults: number[] = [];

        const searchCategories = (category: Category) => {
            if (
                category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                category.description.toLowerCase().includes(searchTerm.toLowerCase())
            ) {
                searchResults.push(category.id);
                if (category.parent !== null) {
                    ({ expandedItems, searchResults } = this.expandAndHighlightParents(category.parent, expandedItems, searchResults));
                }
            }

            if (category.subcategories && category.subcategories.length > 0) {
                category.subcategories.forEach(searchCategories);
            }
        };

        categories.forEach(searchCategories);
        this.setState({ expandedItems, searchResults });
    };

    handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            this.handleSearch();
        }
    };

    // Open edit modal for a category
    handleOpenModal = (category: Category) => {
        this.setState({
            isModalOpen: true,
            currentCategory: category,
            updatedName: category.name,
            updatedDescription: category.description,
        });
    };

    // Close edit modal
    handleCloseModal = () => {
        this.setState({
            isModalOpen: false,
            currentCategory: null,
            updatedName: '',
            updatedDescription: '',
        });
    };

    // Handle input changes in the modal
    handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        this.setState({ [name]: value } as any);
    };

    // Submit updated category data
    handleSubmit = async () => {
        const { currentCategory, updatedName, updatedDescription } = this.state;

        if (currentCategory) {
            try {
                const response = await fetch(`http://localhost:8000/api/categories/${currentCategory.id}/`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: updatedName,
                        description: updatedDescription,
                    }),
                });

                if (response.ok) {
                    console.log('Category updated successfully');
                    this.fetchCategories();
                    this.handleCloseModal();
                } else {
                    console.error('Failed to update category');
                }
            } catch (error) {
                console.error('Error during update:', error);
            }
        }
    };

    // Handle drag start
    handleDragStart = (event: React.DragEvent, categoryId: number) => {
        event.stopPropagation(); // Prevent parent categories from triggering this event
        this.setState({ draggedItemId: categoryId });
        console.log('ID inside handleDragStart', categoryId);
    };

    // Handle drop and call the drag-and-drop API
    handleDrop = async (event: React.DragEvent, newParentId: number | null) => {
        event.stopPropagation(); // Prevent parent categories from triggering this event
        const { draggedItemId } = this.state;

        if (draggedItemId) {
            console.log(`Subcategory with ID: ${draggedItemId} is being moved to Category with ID: ${newParentId}`);

            try {
                const response = await fetch('http://localhost:8000/api/categories/drag_and_drop/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        category_id: newParentId,  // The new parent category (null for top-level)
                        subcategory_id: draggedItemId,  // The category being dragged
                    }),
                });

                if (response.ok) {
                    console.log('Subcategory moved successfully');
                    this.fetchCategories(); // Refetch categories after the move
                } else {
                    console.error('Failed to move subcategory');
                }
            } catch (error) {
                console.error('Error during drop operation:', error);
            }
        }
    };

    // Allow dropping by preventing default behavior
    handleDragOver = (event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation(); // Prevent parent categories from triggering this event
    };

    // Handle drop outside of any category
    handleDropOutside = (event: React.DragEvent) => {
        event.preventDefault();
        console.log('Dropped in empty space. Moving item to the top-level.');
        this.handleDrop(event, null); // Handle drop as top-level (null category_id)
    };

    // Render tree items and overlay the edit icon
    renderTreeItems = (categories: Category[]) => {
        const { searchResults, expandedItems } = this.state;

        if (!categories || categories.length === 0) {
            return null;
        }

        return categories.map((category) => {
            const isHighlighted = searchResults.includes(category.id);
            const isExpanded = expandedItems[category.id] || false;

            return (
                <div key={category.id} className="tree-item-wrapper">
                    <IgrTreeItem
                        key={category.id}
                        label={category.name}
                        value={category}
                        expanded={isExpanded}
                        className={isHighlighted ? 'highlight' : ''}
                    >
                        {category.subcategories && this.renderTreeItems(category.subcategories)}
                    </IgrTreeItem>

                    <FaEdit
                        className="edit-icon"
                        onClick={() => this.handleOpenModal(category)}
                    />
                </div>
            );
        });
    };

    public render(): JSX.Element {
        const { categories, isModalOpen, updatedName, updatedDescription } = this.state;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Search bar */}
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Search categories..."
                        value={this.state.searchTerm}
                        onChange={this.handleSearchInputChange}
                        onKeyPress={this.handleKeyPress}
                        className="search-input"
                    />
                    <button className="search-button" onClick={this.handleSearch}>
                        <FaSearch />
                    </button>
                </div>

                <div className="tree-container" 
                     onDragOver={this.handleDragOver} 
                     onDrop={this.handleDropOutside}
                >
                    <IgrTree>
                        {this.renderTreeItems(categories)}
                    </IgrTree>
                </div>

                {isModalOpen && (
                    <div className="modal">
                        <div className="modal-content">
                            <h3>Edit Category</h3>
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    type="text"
                                    name="updatedName"
                                    value={updatedName}
                                    onChange={this.handleInputChange}
                                    className="input-field"
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <input
                                    type="text"
                                    name="updatedDescription"
                                    value={updatedDescription}
                                    onChange={this.handleInputChange}
                                    className="input-field"
                                />
                            </div>
                            <div className="button-group">
                                <button className="button save-button" onClick={this.handleSubmit}>Save</button>
                                <button className="button cancel-button" onClick={this.handleCloseModal}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<TreeBasicExample />);
