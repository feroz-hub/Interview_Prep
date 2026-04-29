namespace FactoryMethod
{
    // Product
    interface ITech
    {
        void GetFramework();
    }

    // Concrete Product
    class Java : ITech
    {
        public void GetFramework()
        {
            Console.WriteLine("Spring");
        }
    }

    // Concrete Product
    class DotNet : ITech
    {
        public void GetFramework()
        {
            Console.WriteLine("Core");
        }
    }

    // Creator
    abstract class Creator
    {
        // The Factory Method
        public abstract ITech CreateTech();
    }

    // Concrete Creator
    class JavaCreator : Creator
    {
        // Implementation of Factory Method
        public override ITech CreateTech()
        {
            return new Java();
        }
    }

    // Concrete Creator
    class DotNetCreator : Creator
    {
        // Implementation of Factory Method
        public override ITech CreateTech()
        {
            return new DotNet();
        }
    }

    // Client code
    class Program
    {
        static void Main(string[] args)
        {
            // Create a JavaCreator object
            Creator javaCreator = new JavaCreator();

            // Call Factory Method to
            // create a JavaTech object
            ITech javaTech = javaCreator.CreateTech();
            javaTech.GetFramework();            

            // Create a DotNetCreator object
            Creator dotNetCreator = new DotNetCreator();

            // Call Factory Method to
            // create a DotNetTech object
            ITech dotNetTech = dotNetCreator.CreateTech();
            dotNetTech.GetFramework();
            
            Console.ReadLine();            
        }
        //Output: Spring
        //Output: Core
    }

}