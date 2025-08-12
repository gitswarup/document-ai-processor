#!/bin/bash

# MongoDB Atlas Complete Setup Script (Master Script)
# This script orchestrates the complete MongoDB Atlas setup process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "\n${PURPLE}================================${NC}"
    echo -e "${WHITE}$1${NC}"
    echo -e "${PURPLE}================================${NC}\n"
}

print_step() {
    echo -e "${CYAN}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Main setup function
main() {
    clear
    print_header "🚀 MongoDB Atlas Complete Setup"
    
    echo -e "${WHITE}This script will guide you through the complete MongoDB Atlas setup process:${NC}"
    echo "1. 🏗️  Create MongoDB Atlas cluster"
    echo "2. 🗄️  Configure database and collections"
    echo "3. 🔐 Set up security (users and network access)"
    echo "4. 🔗 Generate and test connection strings"
    echo ""
    
    print_warning "Prerequisites:"
    echo "• MongoDB Atlas CLI installed (brew install mongodb-atlas-cli)"
    echo "• MongoDB Atlas account created"
    echo "• Atlas CLI authenticated (atlas auth login)"
    echo ""
    
    read -p "Do you want to continue? (y/N): " continue_setup
    
    if [[ ! $continue_setup =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
    
    # Check prerequisites
    print_step "Checking prerequisites..."
    check_prerequisites
    
    # Get setup mode
    print_header "🎯 Setup Mode Selection"
    echo "Choose your setup mode:"
    echo "1. 🚀 Full automatic setup (recommended for first-time users)"
    echo "2. 📋 Interactive setup (step-by-step with prompts)"
    echo "3. 🔧 Custom setup (run specific steps only)"
    echo ""
    
    read -p "Select mode (1-3): " setup_mode
    
    case $setup_mode in
        1)
            run_full_setup
            ;;
        2)
            run_interactive_setup
            ;;
        3)
            run_custom_setup
            ;;
        *)
            print_error "Invalid selection"
            exit 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    local errors=0
    
    # Check if atlas CLI is installed
    if ! command -v atlas &> /dev/null; then
        print_error "MongoDB Atlas CLI is not installed"
        echo "Install with: brew install mongodb-atlas-cli"
        ((errors++))
    else
        print_success "MongoDB Atlas CLI found"
    fi
    
    # Check if authenticated
    if ! atlas auth whoami &> /dev/null; then
        print_error "Not authenticated with MongoDB Atlas"
        echo "Please run: atlas auth login"
        ((errors++))
    else
        local user=$(atlas auth whoami | grep "Logged in as" | cut -d' ' -f4)
        print_success "Authenticated as: $user"
    fi
    
    # Check if scripts exist
    local required_scripts=("01-create-cluster.sh" "02-configure-database.sh" "03-configure-security.sh" "04-get-connection-string.sh")
    
    for script in "${required_scripts[@]}"; do
        if [ ! -f "$script" ]; then
            print_error "Required script not found: $script"
            ((errors++))
        fi
    done
    
    if [ $errors -gt 0 ]; then
        print_error "$errors prerequisite(s) failed. Please fix the issues above."
        exit 1
    fi
    
    print_success "All prerequisites met!"
    sleep 2
}

# Full automatic setup
run_full_setup() {
    print_header "🚀 Full Automatic Setup"
    
    print_warning "This will create a staging environment with default settings:"
    echo "• Free M0 cluster in Google Cloud (us-central1)"
    echo "• Database: form-autofill-staging"
    echo "• Collections: formdata, keyvalueindices, chathistories"
    echo "• Network access from anywhere (good for staging)"
    echo ""
    
    read -p "Continue with automatic setup? (y/N): " confirm_auto
    
    if [[ ! $confirm_auto =~ ^[Yy]$ ]]; then
        echo "Automatic setup cancelled."
        exit 0
    fi
    
    # Set environment variables for automatic mode
    export AUTO_MODE=true
    export NETWORK_OPTION=1  # Allow from anywhere
    
    run_setup_steps
}

# Interactive setup
run_interactive_setup() {
    print_header "📋 Interactive Setup"
    
    echo "This mode will prompt you for configuration at each step."
    echo "You'll be able to customize cluster settings, security, etc."
    echo ""
    
    run_setup_steps
}

# Custom setup
run_custom_setup() {
    print_header "🔧 Custom Setup"
    
    echo "Select which steps to run:"
    echo "1. Create cluster only"
    echo "2. Configure database only"
    echo "3. Configure security only"
    echo "4. Get connection string only"
    echo "5. Run specific combination"
    echo ""
    
    read -p "Select option (1-5): " custom_option
    
    case $custom_option in
        1)
            run_step "01-create-cluster.sh" "Creating Cluster"
            ;;
        2)
            run_step "02-configure-database.sh" "Configuring Database"
            ;;
        3)
            run_step "03-configure-security.sh" "Configuring Security"
            ;;
        4)
            run_step "04-get-connection-string.sh" "Getting Connection String"
            ;;
        5)
            select_custom_steps
            ;;
        *)
            print_error "Invalid selection"
            exit 1
            ;;
    esac
}

# Select custom steps
select_custom_steps() {
    echo "Select steps to run (space-separated numbers, e.g., '1 3 4'):"
    echo "1. Create cluster"
    echo "2. Configure database"
    echo "3. Configure security"
    echo "4. Get connection string"
    echo ""
    
    read -p "Steps: " -a selected_steps
    
    for step in "${selected_steps[@]}"; do
        case $step in
            1)
                run_step "01-create-cluster.sh" "Creating Cluster"
                ;;
            2)
                run_step "02-configure-database.sh" "Configuring Database"
                ;;
            3)
                run_step "03-configure-security.sh" "Configuring Security"
                ;;
            4)
                run_step "04-get-connection-string.sh" "Getting Connection String"
                ;;
            *)
                print_warning "Skipping invalid step: $step"
                ;;
        esac
    done
}

# Run all setup steps
run_setup_steps() {
    local steps=(
        "01-create-cluster.sh:Creating MongoDB Atlas Cluster"
        "02-configure-database.sh:Configuring Database and Collections"
        "03-configure-security.sh:Setting up Security"
        "04-get-connection-string.sh:Generating Connection Strings"
    )
    
    local current_step=1
    local total_steps=${#steps[@]}
    
    for step_info in "${steps[@]}"; do
        local script="${step_info%%:*}"
        local description="${step_info##*:}"
        
        print_header "Step $current_step/$total_steps: $description"
        
        if run_step "$script" "$description"; then
            print_success "Step $current_step completed successfully!"
        else
            print_error "Step $current_step failed!"
            
            echo ""
            echo "What would you like to do?"
            echo "1. Continue with next step"
            echo "2. Retry this step"
            echo "3. Abort setup"
            
            read -p "Choice (1-3): " error_choice
            
            case $error_choice in
                1)
                    print_warning "Continuing with next step..."
                    ;;
                2)
                    print_step "Retrying step $current_step..."
                    if run_step "$script" "$description"; then
                        print_success "Retry successful!"
                    else
                        print_error "Retry failed. Aborting setup."
                        exit 1
                    fi
                    ;;
                3)
                    print_error "Setup aborted by user"
                    exit 1
                    ;;
            esac
        fi
        
        ((current_step++))
        
        # Brief pause between steps
        if [ $current_step -le $total_steps ]; then
            sleep 2
        fi
    done
    
    print_success "All steps completed!"
    show_completion_summary
}

# Run a single step
run_step() {
    local script="$1"
    local description="$2"
    
    if [ ! -f "$script" ]; then
        print_error "Script not found: $script"
        return 1
    fi
    
    if [ ! -x "$script" ]; then
        print_step "Making script executable: $script"
        chmod +x "$script"
    fi
    
    print_step "Running: $script"
    
    # Run the script and capture output
    if "./$script"; then
        return 0
    else
        return 1
    fi
}

# Show completion summary
show_completion_summary() {
    print_header "🎉 Setup Complete!"
    
    echo -e "${WHITE}MongoDB Atlas setup has been completed successfully!${NC}"
    echo ""
    
    if [ -f ".mongodb-config" ]; then
        source .mongodb-config
        echo "📊 Setup Summary:"
        echo "• Cluster: $CLUSTER_NAME"
        echo "• Database: $DATABASE_NAME"
        echo "• Project: $ATLAS_PROJECT_ID"
        echo "• Username: $DB_USERNAME"
        echo ""
    fi
    
    print_success "Files created:"
    echo "• .mongodb-config - Setup configuration"
    
    if [ -f ".env.mongodb" ]; then
        echo "• .env.mongodb - Application environment (with credentials)"
        print_success "Environment ready for application use"
    fi
    
    if [ -f ".env.mongodb.template" ]; then
        echo "• .env.mongodb.template - Version control safe template"
        print_success "Template ready for sharing"
    fi
    
    if [ -f "init-database.js" ]; then
        echo "• init-database.js - Database initialization script"
    fi
    
    echo ""
    print_header "🚀 Next Steps"
    
    echo "1. 🔒 Security:"
    echo "   • Add .env.mongodb to your .gitignore"
    echo "   • Consider more restrictive network access for production"
    echo ""
    
    echo "2. 🗄️ Database:"
    echo "   • Collections are ready with proper validation and indexes"
    echo "   • Use the connection string in your application"
    echo ""
    
    echo "3. 🧪 Testing:"
    echo "   • Test connection: mongosh \"\$MONGODB_URI\""
    echo "   • Use MongoDB Compass for GUI access"
    echo ""
    
    echo "4. 🏗️ Application Integration:"
    echo "   • Copy .env.mongodb settings to your application"
    echo "   • Update your application's database configuration"
    echo ""
    
    print_success "MongoDB Atlas is ready for your Document AI Processor!"
}

# Error handling
trap 'print_error "Script interrupted"; exit 1' INT

# Change to script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Run main function
main "$@"