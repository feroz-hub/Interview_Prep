
using System;

namespace SimpleFactory
{


    //Without Factory Pattern

    // Concrete Classes
    //class Java
    //{
    //    public string GetFramework()
    //    {
    //        return "Java Spring Boot";
    //    }
    //}

    //class DotNet
    //{
    //    public string GetFramework()
    //    {
    //        return ".NET Core";
    //    }
    //}

    //// Client code
    //class Program
    //{
    //    static void Main(string[] args)
    //    {
    //        // Creating Java object
    //        Java java = new Java();
    //        Console.WriteLine(java.GetFramework()); 
    //        // Output: Java Spring Boot

    //        // Creating DotNet object
    //        DotNet dotnet = new DotNet();
    //        Console.WriteLine(dotnet.GetFramework()); 
    //        // Output: .NET Core
    //    }
    //}


    //With Simple Factory Pattern

    // Interface
    interface ITech
    {
        string GetFramework();
    }

    // Concrete Classes
    class Java : ITech
    {
        public string GetFramework()
        {
            return "Java Spring Boot";
        }
    }
    class DotNet : ITech
    {
        public string GetFramework()
        {
            return ".NET Core";
        }
    }

    // Simple Factory
    class TechFactory
    {
        public ITech CreateTech(string techType)
        {
            if (techType.Equals("Java"))
            {
                return new Java();
            }
            else if (techType.Equals("DotNet"))
            {
                return new DotNet();
            }
            else
            {
                throw new Exception("Invalid");
            }
        }
    }

    // Client code
    class Program
    {
        static void Main(string[] args)
        {
            TechFactory factory = new TechFactory();

            // Creating Java object
            ITech java = factory.CreateTech("Java");
            Console.WriteLine(java.GetFramework()); 
            // Output: Java Spring Boot

            // Creating DotNet object
            ITech dotnet = factory.CreateTech("DotNet");
            Console.WriteLine(dotnet.GetFramework()); 
            // Output: .NET Core
        }
    }




}